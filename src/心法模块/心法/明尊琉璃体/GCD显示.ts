/** 0.81仅作为显示简称；循环标识、帧数和计算值继续使用0.8125。 */
export const 格式化明尊GCD = (value: string | number = '') =>
  String(value).replace(/0\.8125/g, '0.81')
