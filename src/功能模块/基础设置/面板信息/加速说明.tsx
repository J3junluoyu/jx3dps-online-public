import { 获取实际帧数, 获取下一档加速信息 } from '@/工具函数/data'
import 获取当前数据 from '@/数据/数据工具/获取当前数据'
import { 格式化明尊GCD } from '@/心法模块/心法/明尊琉璃体/GCD显示'

const { 名称, 基础GCD = 1.5 } = 获取当前数据()
const 显示GCD = (gcd: number) => (名称 === '明尊琉璃体' ? 格式化明尊GCD(gcd) : gcd)
const 加速档位 = [{ 加速值: 0, GCD: 基础GCD }]
let 下一档 = 获取下一档加速信息(0)
while (下一档) {
  加速档位.push({ 加速值: 下一档.下一档加速值, GCD: 下一档.下一档GCD })
  下一档 = 获取下一档加速信息(下一档.下一档加速值)
}

export default function 加速说明({ 加速值 }: { 加速值: number }) {
  const 当前GCD = 获取实际帧数(基础GCD * 16, 加速值) / 16
  const 下档信息 = 获取下一档加速信息(加速值)

  return (
    <div className='character-haste-tooltip'>
      <div className='character-haste-tooltip-title'>加速档位说明</div>
      <div>当前加速：{加速值}点</div>
      <table>
        <thead>
          <tr>
            <th>档位</th>
            <th>加速值区间</th>
            <th>GCD</th>
          </tr>
        </thead>
        <tbody>
          {加速档位.map((档位, 索引) => (
            <tr key={索引} className={当前GCD === 档位.GCD ? 'character-haste-current' : ''}>
              <td>
                {索引}档{当前GCD === 档位.GCD ? '（当前）' : ''}
              </td>
              <td>
                {档位.加速值}
                {加速档位[索引 + 1] ? `–${加速档位[索引 + 1].加速值 - 1}` : '及以上'}
              </td>
              <td>{显示GCD(档位.GCD)}s</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div>
        {下档信息
          ? `到下一档 ${显示GCD(下档信息.下一档GCD)}s 还差${下档信息.差值}点加速`
          : '已达普通加速最高GCD档位'}
      </div>
      <div className='character-haste-tooltip-note'>
        基础GCD为{基础GCD}秒，按16帧/秒取整，普通加速上限25%。
      </div>
    </div>
  )
}
