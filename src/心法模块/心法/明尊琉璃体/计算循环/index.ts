import type { 循环数据 } from '@/@types/循环'
import 基础循环 from './基础循环'
import 零点七五循环 from './0.75GCD循环'
import 理论循环 from './理论循环'

const 计算循环: 循环数据[] = [基础循环, 零点七五循环, ...理论循环]

export const 已移除明尊循环 = ['明尊自定义命中次数', '迁移的明尊命中次数']

export default 计算循环
