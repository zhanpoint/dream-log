"""
用户名生成服务
"""

import random
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User

# 形容词列表（50个）
ADJECTIVES = [
    "Swift", "Silent", "Brave", "Calm", "Dream", "Mystic", "Cosmic", "Noble",
    "Gentle", "Fierce", "Peaceful", "Wild", "Serene", "Bold", "Clever", "Bright",
    "Dark", "Light", "Golden", "Silver", "Crystal", "Quiet", "Stormy", "Sunny",
    "Lunar", "Solar", "Ancient", "Modern", "Timeless", "Eternal", "Infinite", "Radiant",
    "Shadow", "Nimble", "Wise", "Mighty", "Tender", "Graceful", "Vibrant", "Ethereal",
    "Celestial", "Stellar", "Aurora", "Twilight", "Dawn", "Dusk", "Midnight", "Morning",
    "Evening", "Phantom"
]

# 动物列表（50个）
ANIMALS = [
    "Falcon", "Panda", "Wolf", "Phoenix", "Owl", "Eagle", "Tiger", "Dragon",
    "Dolphin", "Raven", "Fox", "Bear", "Lynx", "Hawk", "Leopard", "Panther",
    "Swan", "Deer", "Whale", "Orca", "Crane", "Heron", "Sparrow", "Robin",
    "Rabbit", "Otter", "Seal", "Penguin", "Peacock", "Butterfly", "Firefly", "Moth",
    "Spider", "Serpent", "Turtle", "Koala", "Raccoon", "Badger", "Beaver", "Squirrel",
    "Hummingbird", "Nightingale", "Starling", "Albatross", "Condor", "Flamingo", "Pelican", "Stork",
    "Gazelle", "Antelope"
]


async def generate_username(user_id: uuid.UUID, db: AsyncSession) -> str:
    """
    基于用户 UUID 生成独特的用户名（形容词+动物）
    
    Args:
        user_id: 用户 UUID
        db: 数据库会话
        
    Returns:
        生成的用户名
    """
    # 使用 UUID 的前8位作为种子
    seed = int(user_id.hex[:8], 16)
    
    # 生成基础用户名
    adj_index = seed % len(ADJECTIVES)
    animal_index = (seed // len(ADJECTIVES)) % len(ANIMALS)
    
    base_username = f"{ADJECTIVES[adj_index]}{ANIMALS[animal_index]}"
    
    # 检查唯一性
    if not await username_exists(base_username, db):
        return base_username
    
    # 如果冲突，添加随机后缀（2位数字）
    for _ in range(10):  # 最多尝试10次
        username_with_suffix = f"{base_username}{random.randint(10, 99)}"
        if not await username_exists(username_with_suffix, db):
            return username_with_suffix
    
    # 如果还是冲突，使用 UUID 的一部分
    return f"{base_username}{user_id.hex[:4]}"


async def username_exists(username: str, db: AsyncSession) -> bool:
    """
    检查用户名是否已存在
    
    Args:
        username: 用户名
        db: 数据库会话
        
    Returns:
        是否存在
    """
    result = await db.execute(
        select(User).where(User.username == username)
    )
    return result.scalar_one_or_none() is not None


async def check_username_available(username: str, db: AsyncSession, exclude_user_id: uuid.UUID | None = None) -> bool:
    """
    检查用户名是否可用（不包括指定用户）
    
    Args:
        username: 用户名
        db: 数据库会话
        exclude_user_id: 要排除的用户ID（用于更新时检查）
        
    Returns:
        是否可用
    """
    query = select(User).where(User.username == username)
    
    if exclude_user_id:
        query = query.where(User.id != exclude_user_id)
    
    result = await db.execute(query)
    return result.scalar_one_or_none() is None
