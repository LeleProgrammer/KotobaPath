# 注音数据与工具

页面渲染器 ruby.js：GPL-3.0-or-later。

词条的明确读音沿用原词库，基础词条仍保留 egg rolls / CC BY-NC 4.0 等原许可；原创教学内容 CC BY 4.0。

句子、例句及阅读正文的词法读音在交付前以 Janome 0.5.0（Apache-2.0）及其 MeCab-IPADIC 数据生成，另加日期、数量词、部分复合词和原文已有显式注音的处理。网站运行不加载 Janome，不需要安装分词包，不调用网络服务。生成的分段数据并非逐字手工校订词典，固有名词、多音字及个别语境可能有误；未知词不臆造读音。

相关许可全文见 JANOME-LICENSE.txt、JANOME-IPADIC-NOTICE.txt。维护者重建时使用 tools/export_ruby.cjs 与 tools/build_ruby.py，保留生成记录 data/ruby-audit.json。
