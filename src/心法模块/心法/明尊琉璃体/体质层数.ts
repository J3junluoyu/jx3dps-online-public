/** 50级朝圣言和禅语共用的基础体质门槛。 */
export const 每层基础体质 = 96
export const 体质增益最大层数 = 100
export const 满层基础体质 = 每层基础体质 * 体质增益最大层数

export const 获取体质增益层数 = (baseVitality: number) =>
  Math.min(体质增益最大层数, Math.max(0, Math.floor(baseVitality / 每层基础体质)))
