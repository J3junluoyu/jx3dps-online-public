import { ratingScale } from './计算'
import { 计算承伤模型 } from './承伤模型'

test('防御数值和等效百分比的结果相同，两种减伤按剩余承伤相乘', () => {
  const 等效防御 = (10 / 17) * ratingScale('shield')
  for (const [防御, 方式] of [
    [等效防御, '数值'],
    [1000 / 27, '百分比'],
  ]) {
    const 仅防御 = 计算承伤模型(防御, 方式, 30, 0)
    const 仅额外减伤 = 计算承伤模型(防御, 方式, 0, 10)
    const 叠加 = 计算承伤模型(防御, 方式, 30, 10)
    expect(仅防御.最终减伤).toBeCloseTo(13 / 30, 12)
    expect(仅额外减伤.最终减伤).toBeCloseTo(13 / 30, 12)
    expect(叠加.最终减伤).toBeCloseTo(0.49, 12)
    expect(叠加.实际承伤).toBeCloseTo(0.51, 12)
  }
})

test('处理零防御、满额减伤和超出范围的百分比', () => {
  expect(计算承伤模型(0, '数值', 30, 10).实际承伤).toBe(0.9)
  expect(计算承伤模型(50, '百分比', 0, 100).实际承伤).toBe(0)
  expect(计算承伤模型(100, '百分比', 30, 10).实际承伤).toBe(0)
  expect(计算承伤模型(101, '百分比', 30, 10)).toBeUndefined()
  expect(计算承伤模型(50, '百分比', 30, 101)).toBeUndefined()
})
