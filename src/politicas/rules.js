const CARACTERES_OBLITATORIOS = ['!','#','$','%','&','=']
const DIGITOS_OBLIGATORIOS = ['0','1','2','3','4','5','6','7','8','9']
const rules = [
    {
        nombre: 'longitud mínima', 
        fn: (pwd) => pwd.length >= 8
    },
    {
        nombre: 'No puede contener espacios en blanco', 
        fn: (pwd) => !pwd.includes(' ')
    },
    {
        nombre: "Contiene al menos uno de los siguiente caracteres !#$%&=",
        fn: (pwd) => CARACTERES_OBLITATORIOS.some(caracter => pwd.includes(caracter))
    },
    {
        nombre: "Contiene al menos un dígito número",
        fn: (pwd) => DIGITOS_OBLIGATORIOS.some(digito => pwd.includes(digito))
    },
    {
        nombre: `El último caracter NO puede ser un caracter de los obligatorios ${CARACTERES_OBLITATORIOS}`,
        fn: (pwd) =>  {
            const ultimoCaracter =  pwd[pwd.length - 1] 
            return !CARACTERES_OBLITATORIOS.some(caracter => caracter == ultimoCaracter)
        }
    }
]

const validarReglas = ({password}) => rules.every(rule => rule.fn(password))
const reglasNoCumplen= (pwd) => rules.filter(rule => !rule.fn(pwd))

module.exports = {validarReglas, reglasNoCumplen }
