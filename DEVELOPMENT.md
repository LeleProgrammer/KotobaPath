# 开发与数据格式

不使用模块与打包器。`index.html` 按顺序加载所有 `data/*.js`，最后加载 `app.js`。
原始8个数据文件各自是一行 `window.NAME = JSON数组;`，可直接离线读取。保留条目ID兼容存档，新增条目须全局唯一。

| 文件 | 全局变量 | 每项字段 |
|---|---|---|
| vocab.js | VOCAB | id, level, word, reading, meaning, pos, accent, note, examples:[[日文,中文]], tags, order |
| grammar.js | GRAMMAR | id, level, pattern, connect, meaning, example, translation, note |
| kanji.js | KANJI | id, char, strokes, grade, level, on:[], kun:[], meaning:[] |
| foundation.js | FOUNDATION | id, title, level, paragraphs:[] |
| readings.js | READINGS | id, level, title, text, translation, questions:[{q,options:[],answer:零起下标,why}] |
| blanks.js | BLANKS | id,level,sentence:包含___,answer,why,zh |
| orders.js | ORDERS | id,level,tokens:正确顺序数组,zh |
| writing.js | WRITING | id,level,title,prompt,targets:[],sample |

`grammar-source.tsv` 用 `|` 分隔，不是普通tab，列序与grammar字段一致（不含id）。发布前修改JS才会生效；该文本只是便于编辑的原始副本。

## 组题

词汇、语法、接续和汉字选择题从同级内容生成，干扰选项文本去重。自动生成选择题不是人工命题的等价替代，也不能计作新增课程。

填空与排序保留独立命题数据，翻译重构共用排序标准句。标准句输入忽略空白、部分标点与全半角差异；读音兼容片假名。并不实现自由文本语义判卷。

动词活用要求明确选择动词类型，不用词尾る猜五段／一段。五段行く的て／た形有特例；いい系形容词单独处理。尊敬补助表达、方言、构词例外与所有词汇性不规则形式不属于通用生成器覆盖范围。

## 状态

schema=1。保存：profile、learned、stars、notes、reviews、wrong、drafts、completed、history、days，新增appVersion、contentVersion与sync元数据。导入只接受支持版本，验证字段、数值范围与条目ID格式，保留未知但有效的条目数据；不把存档字符串作为HTML解释。不自动合并多标签页冲突，检测后停止覆盖并提示导出。

review字段：due为毫秒时间戳；interval单位为天；ease为间隔倍率；seen与correct为累计次数。答错10分钟后到期，答对安排1天、3天、之后乘倍率，单次间隔最多365天。导入允许有限未来日程；不会把未作答题加入复习。

## 安全与离线

无网络数据请求、第三方运行时、账号、API密钥或服务器状态。HTML展示动态文字时使用转义。源码是本地可编辑文件，无法防止使用者篡改内容或进度；这是个人学习工具，不适合作为高风险考试判分系统。

修改后执行 `node --check app.js` 与 `node tests/check.cjs`。测试中的固定总量需随真实数据清单同步。测试不验证语言自然度，扩充课程应进行教师审核和学习者试用。

## 1.2扩展与同步

`data/expansion-source.json`包含本次明确赋ID的原创内容；`tools/build_expansion.py`生成`data/expansion.js`，在基础数据后、应用前加载，追加词汇、语法、阅读、填空、排序与写作，提供TOPICS与USAGE两个新集合，附加中文汉字释义。原始8份JS不重排，不重写。

专题项：id、level、title、paragraphs、examples:[[日文,中文]]。人工语境题：id、level、title、question、options、answer（零起下标）、why，专题配套题另有topic字段。新阅读有genre字段，新增写作有outline和sampleLabel。

sync-core.js负责附加式升级、字段修改标记、取消操作、文本冲突副本和事件去重合并。应用加载时先为旧原始JSON建立备份，然后迁移；未知条目继续保留与导出。所有新作答进入每日事件表，每日统计由基础累计与去重事件汇总。

新阅读问题采用`rq:文章ID:题序`，既有篇级ID仍有效。原题题序不得无迁移地重排。详见SAVE_COMPATIBILITY.md。

扩展生成后运行`node tools/audit.cjs`更新实际数量、分级与数据文件哈希。自动测试保护1.0.1底层数据和本次新增ID的身份，不能通过重新编号来解决测试失败。
