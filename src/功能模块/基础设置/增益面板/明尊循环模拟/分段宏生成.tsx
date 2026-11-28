import React, { useId, useState } from 'react'
import { Col, Form, Input, InputNumber, Row, Select } from 'antd'
import { 明尊爆发结束Buff } from '@/心法模块/心法/明尊琉璃体/宏循环'
import type { 分段宏方案 } from '@/心法模块/模块工具/循环宏'
import { 明尊循环最长时长, 明尊施放技能列表 } from '@/心法模块/心法/明尊琉璃体/逐招时间轴'
import type { 明尊施放技能 } from '@/心法模块/心法/明尊琉璃体/逐招时间轴'
import 宏生成 from '../宏生成'

const 循环示例 = '/cast [sun_power|moon_power] 净世破魔击\n/cast 烈日斩\n/cast 银月斩\n/cast [sun>=moon] 赤日轮\n/cast 幽月轮'
const 爆发示例 = '/cast [moon_power&nobuff:光明相] 光明相\n/cast [sun_power|moon_power] 净世破魔击\n/cast 幽月轮'
interface 宏输入预设<技能 extends string> {
  最长时长: number
  技能列表: readonly 技能[]
  爆发结束Buff: readonly string[]
  默认起手技能: 技能
  默认起爆技能: 技能
  默认爆发收尾技能: 技能
  默认结束Buff: string
  循环示例: string
  爆发示例: string
  条件说明: string
}

interface 宏输入参数<技能 extends string> {
  时长?: number
  有序列: boolean
  禁用: boolean
  初始方案?: 分段宏方案<技能>
  生成: (方案: 分段宏方案<技能>, 时长: number) => void
}

const 明尊预设: 宏输入预设<明尊施放技能> = {
  最长时长: 明尊循环最长时长,
  技能列表: 明尊施放技能列表,
  爆发结束Buff: 明尊爆发结束Buff,
  默认起手技能: '烈日斩',
  默认起爆技能: '光明相',
  默认爆发收尾技能: '净世破魔击',
  默认结束Buff: '光明相',
  循环示例,
  爆发示例,
  条件说明: '常规出招顺序。支持日月灵力、Buff、冷却等条件，外层方括号可省略。',
}

export default function 明尊分段宏生成(props: 宏输入参数<明尊施放技能>) {
  return <分段宏生成 {...props} 预设={明尊预设} />
}

export function 分段宏生成<技能 extends string>({
  时长, 有序列, 禁用, 初始方案, 生成, 预设,
}: 宏输入参数<技能> & { 预设: 宏输入预设<技能> }) {
  const id = useId()
  const 技能选项 = 预设.技能列表.map((技能) => ({ value: 技能, label: 技能 }))
  const Buff选项 = 预设.爆发结束Buff.map((名称) => ({ value: 名称, label: 名称 }))
  const 起手 = 初始方案?.起手
  const 爆发 = 初始方案?.爆发
  const 起手收尾 = 起手 && '技能' in 起手.结束 ? 起手.结束.技能 : undefined
  const 爆发收尾 = 爆发 && '技能' in 爆发.结束 ? 爆发.结束.技能 : undefined
  const [起手宏, 设置起手宏] = useState(起手?.宏 ?? '')
  const [起手结束方式, 设置起手结束方式] = useState<'时间' | '技能'>(起手收尾 ? '技能' : '时间')
  const [起手秒数, 设置起手秒数] = useState<number | null>(起手 && '秒数' in 起手.结束 ? 起手.结束.秒数 : 5)
  const [起手技能, 设置起手技能] = useState(起手收尾 ?? 预设.默认起手技能)
  const [爆发宏, 设置爆发宏] = useState(爆发?.宏 ?? '')
  const [起爆技能, 设置起爆技能] = useState(爆发?.起爆技能 ?? 预设.默认起爆技能)
  const [同时就绪, 设置同时就绪] = useState<技能[]>(爆发?.同时就绪 ?? [])
  const [附加条件, 设置附加条件] = useState(爆发?.附加条件 ?? '')
  const [爆发结束方式, 设置爆发结束方式] = useState<'Buff' | '技能'>(爆发收尾 ? '技能' : 'Buff')
  const [结束Buff, 设置结束Buff] = useState(爆发 && 'Buff' in 爆发.结束 ? 爆发.结束.Buff : 预设.默认结束Buff)
  const [爆发结束技能, 设置爆发结束技能] = useState(爆发收尾 ?? 预设.默认爆发收尾技能)

  return <宏生成
    时长={时长} 最长时长={预设.最长时长} 有序列={有序列} 禁用={禁用}
    宏标签='循环宏' 示例宏={预设.循环示例} 宽度={700} 初始宏={初始方案?.循环宏}
    条件说明={预设.条件说明}
    清空分段宏={() => {
      设置起手宏('')
      设置起手结束方式('时间')
      设置起手秒数(5)
      设置起手技能(预设.默认起手技能)
      设置爆发宏('')
      设置起爆技能(预设.默认起爆技能)
      设置同时就绪([])
      设置附加条件('')
      设置爆发结束方式('Buff')
      设置结束Buff(预设.默认结束Buff)
      设置爆发结束技能(预设.默认爆发收尾技能)
    }}
    前置字段={<>
      <Form.Item label='起手宏（可选）' htmlFor={id + '-opener'}>
        <Input.TextArea id={id + '-opener'} rows={3} spellCheck={false} value={起手宏}
          placeholder={'/cast ' + 预设.默认起手技能} onChange={(事件) => 设置起手宏(事件.target.value)} />
      </Form.Item>
      {!!起手宏.trim() && <Row gutter={12}>
        <Col xs={24} sm={12}><Form.Item label='起手结束条件' htmlFor={id + '-opener-mode'}>
          <Select id={id + '-opener-mode'} value={起手结束方式} onChange={设置起手结束方式} options={[
            { value: '时间', label: '到达指定秒数' }, { value: '技能', label: '起手宏施放指定技能后' },
          ]} />
        </Form.Item></Col>
        <Col xs={24} sm={12}>
          {起手结束方式 === '时间'
            ? <Form.Item label='切换时间（秒）' htmlFor={id + '-opener-time'}>
                <InputNumber id={id + '-opener-time'} min={0.01} max={预设.最长时长} value={起手秒数}
                  onChange={设置起手秒数} />
              </Form.Item>
            : <Form.Item label='起手收尾技能' htmlFor={id + '-opener-skill'}>
                <Select id={id + '-opener-skill'} value={起手技能} onChange={设置起手技能} options={技能选项} showSearch />
              </Form.Item>}
        </Col>
      </Row>}
    </>}
    后置字段={<>
      <Form.Item label='爆发宏（可选）' htmlFor={id + '-burst'}>
        <Input.TextArea id={id + '-burst'} rows={3} spellCheck={false} value={爆发宏}
          placeholder={预设.爆发示例} onChange={(事件) => 设置爆发宏(事件.target.value)} />
      </Form.Item>
      {!!爆发宏.trim() && <>
        <Row gutter={12}>
          <Col xs={24} sm={12}><Form.Item label='起爆技能' htmlFor={id + '-burst-skill'}
            extra='起手结束后，技能就绪时切到爆发宏打前置。'>
            <Select id={id + '-burst-skill'} value={起爆技能} showSearch options={技能选项} onChange={(技能) => {
              if (结束Buff === 起爆技能 && 预设.爆发结束Buff.includes(技能)) 设置结束Buff(技能)
              设置起爆技能(技能)
              设置同时就绪((旧) => 旧.filter((项) => 项 !== 技能))
            }} />
          </Form.Item></Col>
          <Col xs={24} sm={12}><Form.Item label='同时就绪的技能（可选）' htmlFor={id + '-burst-ready'}>
            <Select id={id + '-burst-ready'} mode='multiple' value={同时就绪} onChange={设置同时就绪}
              options={技能选项.filter(({ value }) => value !== 起爆技能)} placeholder='可多选，全部就绪时切宏' />
          </Form.Item></Col>
        </Row>
        <Row gutter={12}>
          <Col span={24}><Form.Item label='切换附加条件（可选）' htmlFor={id + '-burst-condition'}
            extra='这一栏限制何时切宏。单个招式的施放条件可写在对应宏行里。'>
            <Input id={id + '-burst-condition'} value={附加条件} onChange={(事件) => 设置附加条件(事件.target.value)}
              placeholder='留空时按上方就绪设置切换' />
          </Form.Item></Col>
        </Row>
        <Row gutter={12}>
          <Col xs={24} sm={12}><Form.Item label='爆发结束条件' htmlFor={id + '-burst-end-mode'}>
            <Select id={id + '-burst-end-mode'} value={爆发结束方式} onChange={设置爆发结束方式} options={[
              { value: 'Buff', label: 'Buff 消失或层数耗尽' }, { value: '技能', label: '施放指定技能后' },
            ]} />
          </Form.Item></Col>
          <Col xs={24} sm={12}>
            {爆发结束方式 === 'Buff'
              ? <Form.Item label='爆发结束 Buff' htmlFor={id + '-burst-end-buff'} extra='该 Buff 生效后，再消失才结束爆发。'>
                  <Select id={id + '-burst-end-buff'} value={结束Buff} onChange={设置结束Buff} options={Buff选项} />
                </Form.Item>
              : <Form.Item label='爆发收尾技能' htmlFor={id + '-burst-end-skill'}>
                  <Select id={id + '-burst-end-skill'} value={爆发结束技能} onChange={设置爆发结束技能}
                    options={技能选项} showSearch />
                </Form.Item>}
          </Col>
        </Row>
      </>}
    </>}
    生成={(循环宏, 秒数) => 生成({
      循环宏,
      起手: 起手宏.trim() ? {
        宏: 起手宏, 结束: 起手结束方式 === '时间' ? { 秒数: 起手秒数 ?? 0 } : { 技能: 起手技能 },
      } : undefined,
      爆发: 爆发宏.trim() ? {
        宏: 爆发宏, 起爆技能, 同时就绪, 附加条件,
        结束: 爆发结束方式 === 'Buff' ? { Buff: 结束Buff } : { 技能: 爆发结束技能 },
      } : undefined,
    }, 秒数)}
  />
}
