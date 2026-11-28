import type { 循环数据 } from '@/@types/循环'

const 蹬三轮: 循环数据 = {
  名称: '蹬三轮',
  标题: '紫武蹬三轮',
  类型: '默认',
  提供者: '模拟',
  标记: '宏',
  自动选择: false,
  保留当前奇穴: true,
  奇穴: ['光明心'],
  循环详情: [],
  明尊逐招配置: {
    时长: 300,
    延迟: 30,
    目标等级: 54,
    初始日灵: 0,
    初始月魂: 0,
    开场戒火: false,
    背后攻击: false,
    奇穴: ['光明心'],
    序列: [],
    宏自动重排: true,
    宏方案: {
      起手: {
        宏: `/cast moon=100&nobuff:光明相 光明相
/cast 净世破魔击
/cast sun<60 戒火斩
/cast sun<60 烈日斩
/cast moon>20 驱夜断愁
/cast moon<40 银月斩`,
        结束: { 技能: '净世破魔击' },
      },
      循环宏: `/cast 净世破魔击
/cast tnobuff:戒火|tbufftime:戒火<2 戒火斩
/cast moon<60 银月斩
/cast sun=0|sun=60 烈日斩
/cast moon<60 幽月轮
/cast sun<81 赤日轮`,
      爆发: {
        宏: `/cast moon=100&nobuff:光明相 光明相
/cast 净世破魔击
/cast tnobuff:戒火|tbufftime:戒火<6 戒火斩
/cast sun>39 驱夜断愁
/cast 烈日斩
/cast 赤日轮`,
        起爆技能: '光明相',
        同时就绪: ['驱夜断愁'],
        结束: { Buff: '光明相' },
      },
    },
  },
}

export default 蹬三轮
