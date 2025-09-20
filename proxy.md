## 1. 查找mihomo进程

首先检查mihomo是否正在运行：

```bash
ps aux | grep mihomo
```

或者检查端口7897的使用情况：

```bash
sudo netstat -tlnp | grep 7897
```

## 2. 停止mihomo服务

如果mihomo是作为systemd服务运行的，使用以下命令停止：

```bash
sudo systemctl stop mihomo
```
启动服务
```bash
sudo systemctl start mihomo
```

检查服务状态：

```bash
sudo systemctl status mihomo
```

如果要永久禁用该服务：

```bash
sudo systemctl disable mihomo
```

## 3. 如果不是服务形式运行

如果mihomo是直接运行的程序，找到进程ID并终止：

```bash
# 查找进程ID
pgrep mihomo

# 或者使用ps命令
ps aux | grep mihomo

# 终止进程（将<PID>替换为实际的进程ID）
sudo kill <PID>

# 如果普通kill无效，使用强制终止
sudo kill -9 <PID>
```

## 6. 清理Docker配置（可选）

如果您不再需要使用代理，可以从docker-compose.yml中删除代理配置：

- 删除第71-72行的`HTTP_PROXY`和`HTTPS_PROXY`环境变量
- 从第73行的`NO_PROXY`中移除不必要的主机
- 删除第75-76行的`extra_hosts`配置（如果不需要）

这样您的应用程序就不会再尝试使用代理连接了。
