// const ratio = 0.61803

const fmt = function (num) {
  const round = (x) => Math.round(x * 10) / 10
  const decimal = (x) => String(round(x % 1)).replace(/^0/, '')
  if (num > 1000000) {
    num = round(num / 1000000)
    return [num, decimal(num), 'm']
  }
  if (num > 1000) {
    num = round(num / 1000)
    return [num, decimal(num), 'k']
  }
  return [num.toLocaleString(), '']
}

const layout = function (arr) {
  if (!arr.length) {
    return []
  }
  // find max
  let max = arr[0].value
  arr.forEach((o) => {
    if (o.value > max) {
      max = o.value
    }
  })
  // add percentage of max
  arr.forEach((o) => {
    let percentage = (o.value / max) * 100
    o.height = percentage
    // o.width = percentage * ratio
    o.percentage = parseInt(percentage, 10)
    o.height = o.percentage
    o.width = '100%'
    if (o.percentage <= 5) {
      o.width = '25%'
      o.rescaled = true
      o.height = o.percentage * 4
      if (o.percentage <= 0) {
        o.height = 0
      }
    }
    o.fmt = fmt(o.value)
  })
  return arr
}
export default layout
