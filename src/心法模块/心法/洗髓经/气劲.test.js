import { 获取洗髓设置, 洗髓气劲 } from './气劲'

test('读取洗髓2级主副T气劲，不套用明尊转换', () => {
  expect(洗髓气劲.mainTank.vitality_to_solar_attack_power).toBe(1649)
  expect(洗髓气劲.mainTank.vitality_to_magical_overcome).toBe(459)
  expect(洗髓气劲.offTank.vitality_to_solar_attack_power).toBe(546)
  expect(洗髓气劲.offTank.vitality_to_magical_overcome).toBe(154)
})

test('洗髓气劲状态与明尊设置隔离', () => {
  const 增益 = { 明尊设置: { stance: 'mainTank' } }
  expect(获取洗髓设置(增益)).toEqual({ stance: 'offTank' })
  expect(获取洗髓设置({ ...增益, 洗髓设置: { stance: 'mainTank' } })).toEqual({
    stance: 'mainTank',
  })
  expect(增益).toEqual({ 明尊设置: { stance: 'mainTank' } })
})
