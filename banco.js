const sqlite3 = require("sqlite3").verbose();

const banco = new sqlite3.Database("./fila-zero.db", (erro) => {

    if (erro) {
        console.log("Erro ao abrir o banco:", erro.message);
    } else {
        console.log("SQLite conectado com sucesso!");
    }

});


// Ativar chaves estrangeiras
banco.run("PRAGMA foreign_keys = ON");


// ================================
// USUÁRIOS
// ================================

banco.run(`
    CREATE TABLE IF NOT EXISTS usuarios (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        nome TEXT NOT NULL,

        email TEXT UNIQUE NOT NULL,

        matricula TEXT UNIQUE NOT NULL,

        senha TEXT NOT NULL,

        tipo TEXT DEFAULT 'aluno'

    )
`);


// ================================
// PRODUTOS
// ================================

banco.run(`
    CREATE TABLE IF NOT EXISTS produtos (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        nome TEXT NOT NULL,

        descricao TEXT,

        preco REAL NOT NULL,

        categoria TEXT NOT NULL,

        imagem TEXT,

        disponivel INTEGER DEFAULT 1

    )
`);


// ================================
// PEDIDOS
// ================================

banco.run(`
    CREATE TABLE IF NOT EXISTS pedidos (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        usuario_id INTEGER NOT NULL,

        horario_retirada TEXT NOT NULL,

        total REAL NOT NULL,

        status TEXT DEFAULT 'Recebido',

        codigo_retirada TEXT,

        data_pedido DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)

    )
`);


// ================================
// ITENS DO PEDIDO
// ================================

banco.run(`
    CREATE TABLE IF NOT EXISTS itens_pedido (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        pedido_id INTEGER NOT NULL,

        produto_id INTEGER NOT NULL,

        quantidade INTEGER NOT NULL,

        preco REAL NOT NULL,

        FOREIGN KEY (pedido_id)
        REFERENCES pedidos(id),

        FOREIGN KEY (produto_id)
        REFERENCES produtos(id)

    )
`);


module.exports = banco;