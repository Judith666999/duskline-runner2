# 暮线 · DUSKLINE

无需构建步骤的 Three.js 三轨无尽跑酷游戏。所有模型、材质、粒子和音效均为程序化生成，Three.js 已随项目附带。

## 运行

在本目录启动任意静态服务器，然后用现代浏览器访问对应地址：

    python -m http.server 8080

打开 http://localhost:8080 。不要直接双击 index.html，浏览器会限制 ES modules 的本地文件加载。

## 操作

- A / D 或方向键左右：切换跑道
- W / 空格 / 方向键上：跳跃
- S / 方向键下：滑铲
- Esc / P：暂停
- 触屏：左右、上、下滑动

声音设置与最高分保存在浏览器的 localStorage 中。
