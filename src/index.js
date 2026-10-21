const express = require('express')
const app = express()
const PORT = process.env.PORT || 3000
const usuarios = require('./data/usuarios.json')
const {validarReglas, reglasNoCumplen} = require('./politica/reglas') 

app.use(express.json())

app.get('/validador', ( _ , res)=>{
    const userNoCumplen = usuarios
        .filter( usuario => !validarReglas(usuario))
        .map( ( {password, id, ...resto} )=> {
            return {usuario: resto, errores: reglasNoCumplen(password)} }
        )
    return res.status(200).json(userNoCumplen)
})

app.post('/usuarios', (req, res) => {
    const usuario = req.body
    if (!validarReglas(usuario)) 
        return res.status(400).json(
        {mensaje: `La password ${usuario.password} no cumple con los requisitos`, 
        errores:  reglasNoCumplen(usuario.password) })
    const id = usuarios.reduce( (acum, each)=> acum > each.id ? acum : each.id, 0) + 1
    const newUsuario = {id, ...usuario}
    usuarios.push(newUsuario)
    res.status(201).json(newUsuario)
})

app.get('/usuarios', ( _ , res) => {
    res.status(200).json(usuarios)
})

app.get('/usuarios/:id', (req , res) => {
    const id = req.params.id
    const usuario = usuarios.find(u=> u.id == id )
    if (!usuario) 
        return res.status(404).json({mensaje: `El usuario con id ${id} no existe`})
    res.status(200).json(usuario)
})


app.listen(PORT, ()=>{
    console.log(`App running on port ${PORT}`)
})
