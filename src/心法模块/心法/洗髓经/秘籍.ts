import 参考数据 from './参考数据.json'
import 补充秘籍 from './补充秘籍.json'
import type { 选中秘籍信息 } from '@/@types/秘籍'

type 秘籍记录 = { name: string; desc: string; recipe_key: string }
const 原始秘籍: Record<string, 秘籍记录[]> = {
  ...参考数据.recipes,
  [补充秘籍.group]: 补充秘籍.records,
}
const 分组 = [
  ['232', '普渡四方'],
  ['233', '韦驮献杵'],
  ['235', '横扫六合'],
  ['252', '大狮子吼'],
  ['260', '擒龙诀'],
]

// 记录用户2026-10-25页面当前勾选，其他秘籍不展示、不参与保存。
const 固定秘籍ID: Record<string, readonly string[]> = {
  普渡四方: ['recipe_263_1', 'recipe_264_1', 'recipe_269_1', 'recipe_270_1'],
  韦驮献杵: ['recipe_292_1', 'recipe_296_1', 'recipe_297_1', 'recipe_298_1'],
  横扫六合: ['recipe_257_1', 'recipe_259_1'],
  大狮子吼: 补充秘籍.records.map((项) => 项.recipe_key),
  擒龙诀: ['recipe_5774_1', 'recipe_5775_1', 'recipe_5776_1', 'recipe_5777_1'],
}

export const 洗髓秘籍选项 = 分组.map(([group, name]) => ({
  group,
  name,
  records: (原始秘籍[group] || [])
    .filter((项) => 固定秘籍ID[name]?.includes(项.recipe_key))
    .map((项) => ({
      ...项,
      value: `${项.name}：${项.desc}`,
      label: 项.desc.replace(/^(伤害|会心)提高/, '$1').replace(/[。.]$/, ''),
    })),
}))
const 显示名称 = new Map(洗髓秘籍选项.flatMap((组) => 组.records.map((项) => [项.value, 项.label])))
export const 获取洗髓秘籍显示名称 = (名称: string) => 显示名称.get(名称) || 名称

export const 获取洗髓固定秘籍 = (): 选中秘籍信息 =>
  Object.fromEntries(洗髓秘籍选项.map((组) => [组.name, 组.records.map((项) => 项.value)]))

/** 与明尊一致锁定；旧缓存、导入和方案切换统一恢复当前固定模板。 */
export const 规范洗髓秘籍 = (_秘籍?: 选中秘籍信息): 选中秘籍信息 => 获取洗髓固定秘籍()
