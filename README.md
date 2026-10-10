# 暮光疾行 · Duskline Runner

一个完全在浏览器端运行的 Three.js 低多边形无尽跑酷游戏。Three.js 已随项目本地提供，不依赖 CDN 或后端。

## 运行

目录结构：

```text
dusk-runner/
├─ index.html
├─ style.css
├─ main.js
├─ js/
│  ├─ config.js
│  ├─ audio.js
│  ├─ input.js
│  ├─ character.js
│  └─ scene.js
└─ vendor/
   ├─ three.module.min.js
   └─ three.core.min.js
```

请在本目录启动任意静态服务器，然后访问页面：

```powershell
python -m http.server 8765
```

浏览器打开 `http://127.0.0.1:8765/`。不要直接双击 HTML 文件，因为 ES 模块需要通过 HTTP 加载。

## 操作

- `A / D` 或方向键：左右换道
- `W / Space / ↑`：跳跃
- `S / ↓`：滑铲
- `Esc / P`：暂停
- 移动端：向左、右、上、下滑动
