// 使用 X6 API 的思维导图查看器类
class MindMapViewerX6 {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.graph = null;
    this.nodes = [];
    this.edges = [];
    this.currentMode = 'drag'; // 默认拖拽模式
    this.init();
  }

  // 初始化
  init() {
    // 获取URL参数
    const urlParams = new URLSearchParams(window.location.search);
    const summary = urlParams.get('summary');
    const url = urlParams.get('url');

    if (!summary) {
      this.showError('未找到总结内容');
      return;
    }

    // 显示页面信息
    this.showPageInfo(url);

    // 注册自定义节点和边
    this.registerCustomShapes();

    // 初始化 X6 图形
    this.initGraph();

    // 解析总结并绘制思维导图
    const mindMapData = this.parseSummaryToMindMap(summary);
    this.drawMindMap(mindMapData);

    // 绑定事件
    this.bindEvents();
  }

  // 注册自定义节点和边
  registerCustomShapes() {
    // 中心主题或分支主题
    X6.Graph.registerNode(
      'topic',
      {
        inherit: 'rect',
        markup: [
          {
            tagName: 'rect',
            selector: 'body',
          },
          {
            tagName: 'text',
            selector: 'label',
          },
        ],
        attrs: {
          body: {
            rx: 6,
            ry: 6,
            stroke: '#5F95FF',
            fill: '#EFF4FF',
            strokeWidth: 1,
          },
          label: {
            fontSize: 14,
            fill: '#262626',
            textAnchor: 'middle',
            textVerticalAnchor: 'middle',
          },
        },
      },
      true,
    );

    // 子主题
    X6.Graph.registerNode(
      'topic-child',
      {
        inherit: 'rect',
        markup: [
          {
            tagName: 'rect',
            selector: 'body',
          },
          {
            tagName: 'text',
            selector: 'label',
          },
          {
            tagName: 'path',
            selector: 'line',
          },
        ],
        attrs: {
          body: {
            fill: '#ffffff',
            strokeWidth: 0,
            stroke: '#5F95FF',
          },
          label: {
            fontSize: 14,
            fill: '#262626',
            textVerticalAnchor: 'bottom',
            textAnchor: 'start',
          },
          line: {
            stroke: '#5F95FF',
            strokeWidth: 2,
            d: 'M 0 15 L 60 15',
          },
        },
      },
      true,
    );

    // 连接器
    X6.Graph.registerConnector(
      'mindmap',
      (sourcePoint, targetPoint, routerPoints, options) => {
        const midX = sourcePoint.x + 10;
        const midY = sourcePoint.y;
        const ctrX = (targetPoint.x - midX) / 5 + midX;
        const ctrY = targetPoint.y;
        const pathData = `
         M ${sourcePoint.x} ${sourcePoint.y}
         L ${midX} ${midY}
         Q ${ctrX} ${ctrY} ${targetPoint.x} ${targetPoint.y}
        `;
        return options.raw ? X6.Path.parse(pathData) : pathData;
      },
      true,
    );

    // 边
    X6.Graph.registerEdge(
      'mindmap-edge',
      {
        inherit: 'edge',
        connector: {
          name: 'mindmap',
        },
        attrs: {
          line: {
            targetMarker: '',
            stroke: '#A2B1C3',
            strokeWidth: 2,
          },
        },
        zIndex: 0,
      },
      true,
    );
  }

  // 显示页面信息
  showPageInfo(url) {
    const urlElement = document.getElementById('page-url');
    if (urlElement) {
      urlElement.href = url;
      urlElement.textContent = url;
    }
  }

  // 初始化 X6 图形
  initGraph() {
    // 清空容器
    this.container.innerHTML = '';

    // 创建 X6 图形实例
    this.graph = new X6.Graph({
      container: this.container,
      width: window.innerWidth,
      height: window.innerHeight,
      grid: {
        visible: true,
        type: 'dot',
        size: 10,
        color: '#E2E2E2',
      },
      background: {
        color: '#fff',
      },
      // 启用画布拖拽
      panning: {
        enabled: true,
        modifiers: ['ctrl', 'meta'],
      },
      // 启用鼠标滚轮缩放
      mousewheel: {
        enabled: true,
        modifiers: ['ctrl', 'meta'],
        zoomAtMousePosition: true,
        guard: (e) => {
          return e.ctrlKey || e.metaKey;
        },
      },
      connecting: {
        connectionPoint: 'anchor',
        snap: true,
        allowBlank: false,
        allowLoop: false,
        highlight: true,
      },
      interacting: {
        nodeMovable: true,
        edgeMovable: false,
        edgeLabelMovable: false,
        magnetConnectable: true,
        magnetAdsorbed: true,
      },
    });

    // 监听窗口大小变化
    window.addEventListener('resize', () => {
      this.graph.resize(window.innerWidth, window.innerHeight);
    });
  }

  // 解析总结为思维导图数据
  parseSummaryToMindMap(summary) {
    const lines = summary.split('\n').filter(line => line.trim());
    const root = {
      id: 'root',
      type: 'topic',
      label: '网页总结',
      width: 160,
      height: 50,
      children: []
    };

    let currentSection = null;
    let currentSubsection = null;
    let foundFirstSection = false; // 标记是否找到第一个章节

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // 跳过空行
      if (!trimmedLine) continue;

      // 检测主要章节（通常以数字或中文数字开头）
      if (/^[一二三四五六七八九十\d]+[、.．]/.test(trimmedLine) || 
          /^[A-Z][A-Z\s]*$/.test(trimmedLine) ||
          trimmedLine.includes('：') && trimmedLine.length < 20) {
        
        // 如果还没有找到第一个章节，跳过页面标题等前置内容
        if (!foundFirstSection) {
          // 检查是否以数字开头，表示这是第一个真正的章节标题
          if (/^\d+[、.．]/.test(trimmedLine)) {
            foundFirstSection = true;
          } else {
            continue; // 跳过页面标题等前置内容
          }
        }
        
        currentSection = {
          id: `section-${root.children.length}`,
          type: 'topic-branch',
          label: this.cleanText(trimmedLine),
          width: 120,
          height: 40,
          children: []
        };
        root.children.push(currentSection);
        currentSubsection = null;
      }
      // 检测子章节
      else if (currentSection && 
               (/^[•·▪▫◦‣⁃]/.test(trimmedLine) || 
                /^[a-z][a-z\s]*$/.test(trimmedLine) ||
                trimmedLine.startsWith('  ') || trimmedLine.startsWith('\t'))) {
        
        currentSubsection = {
          id: `${currentSection.id}-sub-${currentSection.children.length}`,
          type: 'topic-child',
          label: this.cleanText(trimmedLine.replace(/^[•·▪▫◦‣⁃\s]+/, '')),
          width: 100,
          height: 30,
        };
        currentSection.children.push(currentSubsection);
      }
      // 普通内容
      else if (currentSubsection) {
        currentSubsection.children = currentSubsection.children || [];
        currentSubsection.children.push({
          id: `${currentSubsection.id}-item-${currentSubsection.children.length}`,
          type: 'topic-child',
          label: this.cleanText(trimmedLine),
          width: 120,
          height: 30,
        });
      }
      else if (currentSection) {
        currentSection.children.push({
          id: `${currentSection.id}-item-${currentSection.children.length}`,
          type: 'topic-child',
          label: this.cleanText(trimmedLine),
          width: 120,
          height: 30,
        });
      }
      else if (foundFirstSection) {
        // 如果没有章节结构，但已经找到第一个章节，直接作为根节点的子节点
        root.children.push({
          id: `item-${root.children.length}`,
          type: 'topic-child',
          label: this.cleanText(trimmedLine),
          width: 120,
          height: 30,
        });
      }
    }

    return root;
  }

  // 清理文本，去掉 Markdown 语法符号
  cleanText(text) {
    return text
      // 去掉 ** 符号
      .replace(/\*\*/g, '')
      // 去掉有序列表符号 (数字. 或 数字、)
      .replace(/^\d+[.．、]\s*/, '')
      // 去掉无需列表符号
      .replace(/^[•·▪▫◦‣⁃\-\*]\s*/, '')
      // 去掉冒号
      .replace(/：/g, '')
      .replace(/:/g, '')
      // 去掉多余的空白字符
      .trim();
  }

  // 绘制思维导图
  drawMindMap(data) {
    // 清空现有节点和边
    this.nodes = [];
    this.edges = [];

    // 使用改进的层次布局算法
    const result = this.calculateGlobalLayout(data);
    const cells = [];

    // 递归创建节点和边
    const traverse = (hierarchyItem) => {
      if (hierarchyItem) {
        const { data, children } = hierarchyItem;
        
        // 创建节点
        const node = this.graph.createNode({
          id: data.id,
          shape: data.type === 'topic-child' ? 'topic-child' : 'topic',
          x: hierarchyItem.x,
          y: hierarchyItem.y,
          width: data.width,
          height: data.height,
          label: data.label,
          type: data.type,
        });
        
        cells.push(node);
        this.nodes.push(node);

        // 创建边
        if (children) {
          children.forEach((item) => {
            const { id, data } = item;
            const edge = this.graph.createEdge({
              shape: 'mindmap-edge',
              source: {
                cell: hierarchyItem.id,
                anchor: data.type === 'topic-child'
                  ? {
                      name: 'right',
                      args: {
                        dx: -16,
                      },
                    }
                  : {
                      name: 'center',
                      args: {
                        dx: '25%',
                      },
                    },
              },
              target: {
                cell: id,
                anchor: {
                  name: 'left',
                },
              },
            });
            
            cells.push(edge);
            this.edges.push(edge);
            traverse(item);
          });
        }
      }
    };

    traverse(result);
    
    // 重置图形
    this.graph.resetCells(cells);
    
    // 居中显示
    this.graph.centerContent();
    
    // 适应窗口
    this.zoomToFit();
    
    // 默认启用拖拽模式
    this.enableDragMode();
    
    console.log('思维导图创建完成，节点数量:', this.nodes.length, '连接数量:', this.edges.length);
  }

  // 全局布局计算算法
  calculateGlobalLayout(data) {
    // 第一步：计算每个节点的子树高度和实际占用空间
    const calculateSubtreeSpace = (node) => {
      if (!node.children || node.children.length === 0) {
        return {
          height: 1,
          totalSpace: 40, // 单个节点占用40px高度
          leafCount: 1
        };
      }
      
      let totalHeight = 0;
      let totalSpace = 0;
      let totalLeafCount = 0;
      
      node.children.forEach(child => {
        const childSpace = calculateSubtreeSpace(child);
        totalHeight += childSpace.height;
        totalSpace += childSpace.totalSpace;
        totalLeafCount += childSpace.leafCount;
      });
      
      // 计算垂直间距
      const verticalSpacing = 20;
      const totalSpacing = (node.children.length - 1) * verticalSpacing;
      
      // 确保最小空间：即使只有一个子节点，也要保持最小间距
      const minSpace = Math.max(totalSpace + totalSpacing, 60); // 最小60px空间
      
      return {
        height: Math.max(totalHeight, node.children.length),
        totalSpace: minSpace,
        leafCount: totalLeafCount
      };
    };

    // 第二步：计算布局
    const layout = (node, level = 0, x = 0, y = 0) => {
      const result = {
        id: node.id,
        x: x,
        y: y,
        data: node,
        children: []
      };

      if (node.children && node.children.length > 0) {
        // 计算每个子节点的子树空间
        const childSpaces = node.children.map(child => ({
          ...calculateSubtreeSpace(child),
          child: child
        }));
        
        // 计算总空间需求
        const totalSpace = childSpaces.reduce((sum, space) => sum + space.totalSpace, 0);
        
        // 确保最小总空间，即使子节点很少
        const minTotalSpace = Math.max(totalSpace, 80); // 最小80px总空间
        
        // 计算子节点的起始Y位置
        const startY = y - minTotalSpace / 2;
        let currentY = startY;

        childSpaces.forEach((spaceInfo, index) => {
          const { child, totalSpace: childTotalSpace } = spaceInfo;
          
          // 子节点的Y位置是其占用空间的中心
          const childY = currentY + childTotalSpace / 2;
          
          const childResult = layout(
            child, 
            level + 1, 
            x + 200 + level * 50, 
            childY
          );
          
          result.children.push(childResult);
          
          // 更新下一个节点的起始位置
          currentY += childTotalSpace;
        });
      }

      return result;
    };

    return layout(data, 0, 0, 0);
  }

  // 绑定事件
  bindEvents() {
    // 缩放控制
    document.getElementById('zoom-in').addEventListener('click', () => {
      this.zoom(0.1);
    });
    
    document.getElementById('zoom-out').addEventListener('click', () => {
      this.zoom(-0.1);
    });
    
    document.getElementById('zoom-fit').addEventListener('click', () => {
      this.zoomToFit();
    });
    
    document.getElementById('zoom-reset').addEventListener('click', () => {
      this.resetZoom();
    });

    // 添加拖拽控制按钮事件
    this.addDragControls();

    // 监听边连接事件
    this.graph.on('edge:connected', ({ isNew, edge }) => {
      if (isNew) {
        console.log('新连接创建:', edge.id);
      }
    });

    // 监听节点移动事件
    this.graph.on('node:moved', ({ node }) => {
      console.log('节点移动:', node.id);
    });
  }

  // 添加拖拽控制功能
  addDragControls() {
    // 创建拖拽控制按钮
    const dragControls = document.createElement('div');
    dragControls.className = 'drag-controls';
    dragControls.innerHTML = `
      <button id="enable-drag" title="启用拖拽" class="drag-btn active">拖拽</button>
      <button id="enable-select" title="启用选择" class="drag-btn">选择</button>
    `;
    
    // 插入到控制面板中
    const controls = document.querySelector('.controls');
    controls.appendChild(dragControls);

    // 启用拖拽按钮事件
    document.getElementById('enable-drag').addEventListener('click', () => {
      this.enableDragMode();
      this.currentMode = 'drag';
      this.updateDragButtons();
    });

    // 启用选择按钮事件
    document.getElementById('enable-select').addEventListener('click', () => {
      this.enableSelectMode();
      this.currentMode = 'select';
      this.updateDragButtons();
    });

    // 添加样式
    this.addDragControlsStyle();
  }

  // 启用拖拽模式
  enableDragMode() {
    try {
      // 启用画布拖拽
      if (this.graph.enablePanning) {
        this.graph.enablePanning();
      }
      // 禁用节点选择，但保持节点可移动
      if (this.graph.setInteracting) {
        this.graph.setInteracting({
          nodeMovable: true,
          edgeMovable: false,
          edgeLabelMovable: false,
          magnetConnectable: false,
          magnetAdsorbed: false,
        });
      }
      this.container.style.cursor = 'grab';
    } catch (error) {
      console.warn('启用拖拽模式时出错:', error);
    }
  }

  // 启用选择模式
  enableSelectMode() {
    try {
      // 禁用画布拖拽
      if (this.graph.disablePanning) {
        this.graph.disablePanning();
      }
      // 启用节点选择和连接
      if (this.graph.setInteracting) {
        this.graph.setInteracting({
          nodeMovable: true,
          edgeMovable: false,
          edgeLabelMovable: false,
          magnetConnectable: true,
          magnetAdsorbed: true,
        });
      }
      this.container.style.cursor = 'default';
    } catch (error) {
      console.warn('启用选择模式时出错:', error);
    }
  }

  // 更新拖拽按钮状态
  updateDragButtons() {
    const dragBtn = document.getElementById('enable-drag');
    const selectBtn = document.getElementById('enable-select');
    
    // 简化状态检查，基于当前模式
    if (this.currentMode === 'drag') {
      dragBtn.classList.add('active');
      selectBtn.classList.remove('active');
    } else {
      dragBtn.classList.remove('active');
      selectBtn.classList.add('active');
    }
  }

  // 添加拖拽控制按钮样式
  addDragControlsStyle() {
    const style = document.createElement('style');
    style.textContent = `
      .drag-controls {
        margin-top: 10px;
        display: flex;
        flex-direction: column;
        gap: 5px;
      }
      
      .drag-btn {
        width: 40px;
        height: 30px;
        border: 1px solid #ddd;
        background: #fff;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        color: #333;
        transition: all 0.2s;
      }
      
      .drag-btn:hover {
        background: #f0f0f0;
        border-color: #007acc;
      }
      
      .drag-btn.active {
        background: #007acc;
        color: white;
        border-color: #007acc;
      }
    `;
    document.head.appendChild(style);
  }

  // 缩放
  zoom(delta) {
    const currentZoom = this.graph.zoom();
    const newZoom = Math.max(0.5, Math.min(3, currentZoom + delta));
    this.graph.zoom(newZoom);
  }

  // 适应窗口
  zoomToFit() {
    if (this.nodes.length === 0) return;

    const padding = 50;
    this.graph.zoomToFit({ padding });
  }

  // 重置缩放
  resetZoom() {
    this.graph.zoom(1);
    this.graph.centerContent();
  }

  // 显示错误信息
  showError(message) {
    this.container.innerHTML = `
      <div class="error">
        <h3>加载失败</h3>
        <p>${message}</p>
        <button onclick="location.reload()">重新加载</button>
      </div>
    `;
  }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  new MindMapViewerX6('mindmap-container');
}); 