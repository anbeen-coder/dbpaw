# v0.5.0 Release Notes / v0.5.0 版本更新说明

**150 commits | 59 features | 25 fixes | 41 tests**

---

## New Features / 新功能

### ER Diagram / ER 关系图

- Full ER diagram powered by React Flow + dagre auto-layout / 基于 React Flow + dagre 自动布局的完整 ER 关系图
- Foreign key detection for all relational drivers (MySQL, PostgreSQL, Oracle, MSSQL, Db2) / 所有关系型数据库的外键检测
- Theme adaptation for controls, minimap, and edges / 控件、小地图和连线的主题适配
- ER button integrated into table toolbar / ER 按钮集成到表工具栏

### MCP Server / MCP 服务器

- Complete MCP protocol support (2025-03-26) with HTTP transport via axum / 完整的 MCP 协议支持（2025-03-26），基于 axum 的 HTTP 传输
- Added Resources, Prompts, Sampling, Completion, Notifications modules / 新增 Resources、Prompts、Sampling、Completion、Notifications 模块
- CLI args for transport mode selection / CLI 参数支持传输模式选择

### New Database Drivers / 新数据库驱动

- IBM Db2 LUW driver (via ODBC) / IBM Db2 LUW 驱动（通过 ODBC）
- Apache Cassandra / ScyllaDB driver / Apache Cassandra / ScyllaDB 驱动

### Connection Import / 连接导入

- Import connections from DBeaver (JSON) and Navicat (NCX) / 从 DBeaver（JSON）和 Navicat（NCX）导入连接
- ImportDialog with source cards UI / 带来源卡片的导入对话框 UI

### Sidebar Navigation Enhancements / 侧边栏导航增强

- Oracle: packages, sequences, types / Oracle：包、序列、类型
- MSSQL: synonyms / MSSQL：同义词
- Db2: sequences / Db2：序列
- ClickHouse: materialized views group / ClickHouse：物化视图分组
- SimpleMode for minimal tree view in tabs layout / 标签页布局中的精简树视图模式
- Per-database groups with DatabaseGroupConfig / 按数据库分组配置
- Right-click context menus for databases and tables / 数据库和表的右键菜单

### Table Editor Improvements / 表格编辑器改进

- Multi-cell selection copy / 多单元格选择复制
- Right-click cell filter menu / 右键单元格筛选菜单
- Table row numbers and zebra stripes display settings / 表格行号和斑马纹显示设置

### Other / 其他

- Settings dialog open speed optimized / 设置对话框打开速度优化
- MongoDB driver consolidated and improved / MongoDB 驱动整合优化

---

## Bug Fixes / 问题修复

- PostgreSQL: quote identifiers in ORDER BY, count queries, and fetch_table_rows / PostgreSQL：ORDER BY、计数查询和数据获取中的标识符引号处理
- Schema foreign key quality issues in Oracle, MySQL, MSSQL / Oracle、MySQL、MSSQL 的外键质量问题
- ER diagram foreign keys not rendering for MySQL / MySQL 的 ER 图外键不渲染
- Cell selection color unified for click and drag / 点击和拖拽选择的单元格颜色统一
- TabsContent state preserved across tab switches / 标签页切换时内容状态保持
- Cassandra: improved DDL/DML execution and type formatting / Cassandra：改进 DDL/DML 执行和类型格式化
- Db2: ODBC value escaping and DML commit support / Db2：ODBC 值转义和 DML 提交支持

---

## Testing / 测试

- 41 test commits covering MCP, Cassandra, MongoDB, Redis, Elasticsearch, ER Diagram, connections, metadata, query modules / 41 个测试提交，覆盖 MCP、Cassandra、MongoDB、Redis、Elasticsearch、ER 图、连接、元数据、查询模块
- Elasticsearch integration test split into 8 independent scenarios / Elasticsearch 集成测试拆分为 8 个独立场景
- SQL safety integration tests expanded / SQL 安全集成测试扩展

---

## Breaking Changes / 破坏性变更

- Removed Japanese language support / 移除日语语言支持
