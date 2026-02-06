---
inclusion: always
---

# FastAPI 最佳实践

## 1. 异步编程规范

### 统一使用异步
- 所有涉及 I/O 操作（数据库、网络请求、文件操作）必须使用 `async/await`
- 路由函数优先使用 `async def`，除非确定是纯计算任务
- 数据库操作使用异步 ORM（如 SQLAlchemy 的 `AsyncSession`）

```python
# ✅ 正确
@app.get("/users/{user_id}")
async def get_user(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()

# ❌ 错误：忘记 await
async def get_user(user_id: int):
    result = db.execute(select(User))  # 缺少 await
```

## 2. HTTP 客户端管理

### Session 复用
- **禁止**在每个请求中创建新的 HTTP Client（`httpx.AsyncClient`）
- 在 `lifespan` 中创建全局 Client，整个应用生命周期复用连接池

```python
# ✅ 正确：全局复用
from contextlib import asynccontextmanager
import httpx

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时创建
    app.state.http_client = httpx.AsyncClient()
    yield
    # 关闭时清理
    await app.state.http_client.aclose()

app = FastAPI(lifespan=lifespan)

@app.get("/proxy")
async def proxy(request: Request):
    response = await request.app.state.http_client.get("https://api.example.com")
    return response.json()

# ❌ 错误：每次请求都创建新 Client
@app.get("/proxy")
async def proxy():
    async with httpx.AsyncClient() as client:  # 性能差
        response = await client.get("https://api.example.com")
```

## 3. 依赖注入

### 使用 Depends 管理依赖
- 数据库会话、认证、配置等通过 `Depends()` 注入
- 避免在路由函数内直接创建资源

```python
# ✅ 正确
async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    return verify_token(token)

@app.get("/me")
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

# ❌ 错误：在路由内部处理
@app.get("/me")
async def read_users_me(token: str):
    user = verify_token(token)  # 应该通过依赖注入
```

## 4. 数据验证

### 使用 Pydantic 模型
- 请求体、响应体都使用 Pydantic 模型定义
- 利用 Pydantic 的自动验证和序列化

```python
# ✅ 正确
class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8)

@app.post("/users", response_model=UserResponse)
async def create_user(user: UserCreate, db: AsyncSession = Depends(get_db)):
    # user 已经过验证
    pass
```

## 5. 错误处理

### 使用 HTTPException
- 统一使用 `HTTPException` 返回错误
- 自定义异常处理器处理特定错误

```python
from fastapi import HTTPException, status

@app.get("/users/{user_id}")
async def get_user(user_id: int, db: AsyncSession = Depends(get_db)):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user
```

## 6. 路由组织

### 使用 APIRouter 模块化
- 按功能模块拆分路由
- 使用前缀和标签组织 API

```python
# app/api/users.py
router = APIRouter(prefix="/users", tags=["users"])

@router.get("/")
async def list_users(): ...

@router.post("/")
async def create_user(): ...

# app/main.py
app.include_router(users.router, prefix="/api")
```

## 7. 配置管理

### 使用 Pydantic Settings
- 环境变量通过 `pydantic-settings` 管理
- 配置类型安全且支持验证

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    secret_key: str
    debug: bool = False
    
    model_config = SettingsConfigDict(env_file=".env")

settings = Settings()
```

## 8. 数据库操作

### 事务管理
- 使用依赖注入自动管理事务
- 异常时自动回滚

```python
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
```

## 9. 类型注解

### 完整的类型提示
- 所有函数参数和返回值都添加类型注解
- 配合 mypy 进行静态类型检查

```python
# ✅ 正确
async def get_user_by_id(db: AsyncSession, user_id: int) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()
```

## 10. 性能优化

### 关键点
- 使用连接池（数据库、HTTP 客户端）
- 避免 N+1 查询，使用 `joinedload` 或 `selectinload`
- 合理使用缓存（Redis）
- 长时间任务使用后台任务（Celery）

```python
# ✅ 正确：预加载关联数据
stmt = select(User).options(selectinload(User.posts)).where(User.id == user_id)
result = await db.execute(stmt)
user = result.scalar_one_or_none()
```
