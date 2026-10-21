const operations = {
    inc: n => n + 10,
    dec: n => n - 3,
    mul: n => n * -2,
}
const keys = ['mul', 'inc', 'dec']
const values = [2, -5,  6]
const result = values.map(value =>
    keys.reduce(  (best, key)  => {
        const current = operations[key](value)
        return current > best.value ? {fn: key, value: current} : best
    }, {fn: undefined, value:-Infinity})
)
console.log(result)
