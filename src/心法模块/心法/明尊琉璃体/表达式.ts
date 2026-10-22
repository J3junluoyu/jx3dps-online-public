/** A small arithmetic interpreter for Generator formulae. Never executes source text. */
type Variables = Record<string, number>
type Expression = (variables: Variables) => number
const cache = new Map<string, Expression>()

export function evaluateExpression(source: string, variables: Variables): number {
  let expression = cache.get(source)
  if (!expression) {
    const tokens: string[] = []
    const pattern = /\s*(\d+(?:\.\d*)?(?:[eE][+-]?\d+)?|[A-Za-z_]\w*|[()+*/,-])/g
    let offset = 0
    while (offset < source.trimEnd().length) {
      pattern.lastIndex = offset
      const match = pattern.exec(source)
      if (!match || match.index !== offset)
        throw new Error(`不支持的计算表达式：${source.slice(offset)}`)
      tokens.push(match[1])
      offset = pattern.lastIndex
    }
    let index = 0
    const primary = (): Expression => {
      const token = tokens[index++]
      if (token === '+' || token === '-') {
        const child = primary()
        return (v) => (token === '-' ? -child(v) : child(v))
      }
      if (token === '(') {
        const child = sum()
        if (tokens[index++] !== ')') throw new Error('表达式括号不匹配')
        return child
      }
      if (token && /^\d/.test(token)) return () => Number(token)
      if (token && /^[A-Za-z_]\w*$/.test(token)) {
        if (tokens[index] === '(') {
          if (token !== 'int') throw new Error(`不支持的函数：${token}`)
          index++
          const child = sum()
          if (tokens[index++] !== ')') throw new Error('表达式括号不匹配')
          return (v) => Math.trunc(child(v))
        }
        return (v) => {
          if (Object.prototype.hasOwnProperty.call(v, token)) return v[token]
          if (/^(recipe|buff)_\d+_\d+$/.test(token)) return 0
          throw new Error(`缺少计算属性：${token}`)
        }
      }
      throw new Error('无效的计算表达式')
    }
    const product = (): Expression => {
      let left = primary()
      while (tokens[index] === '*' || tokens[index] === '/') {
        const operator = tokens[index++]
        const previous = left
        const right = primary()
        left = (v) => (operator === '*' ? previous(v) * right(v) : previous(v) / right(v))
      }
      return left
    }
    const sum = (): Expression => {
      let left = product()
      while (tokens[index] === '+' || tokens[index] === '-') {
        const operator = tokens[index++]
        const previous = left
        const right = product()
        left = (v) => (operator === '+' ? previous(v) + right(v) : previous(v) - right(v))
      }
      return left
    }
    expression = sum()
    if (index !== tokens.length) throw new Error('表达式中存在多余内容')
    cache.set(source, expression)
  }
  const result = expression(variables)
  if (!Number.isFinite(result)) throw new Error('计算结果不是有限数值')
  return result
}
