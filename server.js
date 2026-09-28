const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const path = require("path");

const banco = require("./banco");

const app = express();

const PORTA = 3000;


// ==================================================
// CONFIGURAÇÕES
// ==================================================

app.use(express.json());

app.use(
    express.urlencoded({
        extended: true
    })
);


// ==================================================
// SESSÃO
// ==================================================

app.use(
    session({

        secret: "fila-zero-secreto",

        resave: false,

        saveUninitialized: false

    })
);


// ==================================================
// ARQUIVOS DO SITE
// IMPORTANTE: DEVE FICAR ANTES DAS ROTAS
// ==================================================

app.use(
    express.static(
        path.join(__dirname, "public")
    )
);


// ==================================================
// PÁGINA INICIAL
// ==================================================

app.get("/", (req, res) => {

    // Não está logado
    if (!req.session.usuario) {

        return res.redirect("/login.html");

    }


    // Usuário da cantina
    if (
        req.session.usuario.tipo === "cantina"
    ) {

        return res.redirect("/painel.html");

    }


    // Usuário aluno
    res.sendFile(
        path.join(
            __dirname,
            "public",
            "index.html"
        )
    );

});


// ==================================================
// PAINEL DA CANTINA
// ==================================================

app.get("/painel.html", (req, res) => {

    if (!req.session.usuario) {

        return res.redirect("/login.html");

    }


    if (
        req.session.usuario.tipo !== "cantina"
    ) {

        return res.redirect("/");

    }


    res.sendFile(
        path.join(
            __dirname,
            "public",
            "painel.html"
        )
    );

});


// ==================================================
// LOGIN
// ==================================================

app.post("/login", (req, res) => {

    const { email, senha } = req.body;


    banco.get(

        `
        SELECT *
        FROM usuarios
        WHERE email = ?
        OR matricula = ?
        `,

        [email, email],

        (erro, usuario) => {

            if (erro) {

                console.log(erro);

                return res.json({

                    sucesso: false,

                    mensagem:
                        "Erro ao consultar o banco."

                });

            }


            if (!usuario) {

                return res.json({

                    sucesso: false,

                    mensagem:
                        "Usuário não encontrado."

                });

            }


            const senhaCorreta =
                bcrypt.compareSync(
                    senha,
                    usuario.senha
                );


            if (!senhaCorreta) {

                return res.json({

                    sucesso: false,

                    mensagem:
                        "Senha incorreta."

                });

            }


            // Salvar usuário na sessão

            req.session.usuario = {

                id: usuario.id,

                nome: usuario.nome,

                email: usuario.email,

                matricula:
                    usuario.matricula,

                tipo: usuario.tipo

            };


            // Enviar resposta

            res.json({

                sucesso: true,

                tipo: usuario.tipo

            });

        }

    );

});


// ==================================================
// USUÁRIO LOGADO
// ==================================================

app.get("/api/usuario", (req, res) => {

    if (!req.session.usuario) {

        return res.status(401).json({

            mensagem:
                "Usuário não está logado."

        });

    }


    res.json(
        req.session.usuario
    );

});


// ==================================================
// PRODUTOS PARA O ALUNO
// ==================================================

app.get("/api/produtos", (req, res) => {

    banco.all(

        `
        SELECT *

        FROM produtos

        WHERE disponivel = 1

        ORDER BY categoria, nome
        `,

        [],

        (erro, produtos) => {

            if (erro) {

                console.log(erro);

                return res.status(500).json({

                    mensagem:
                        "Erro ao buscar produtos."

                });

            }


            res.json(produtos);

        }

    );

});


// ==================================================
// CRIAR PEDIDO
// ==================================================

app.post("/api/pedidos", (req, res) => {

    if (!req.session.usuario) {

        return res.status(401).json({

            sucesso: false,

            mensagem:
                "Você precisa estar logado."

        });

    }


    // Apenas aluno

    if (
        req.session.usuario.tipo !== "aluno"
    ) {

        return res.status(403).json({

            sucesso: false,

            mensagem:
                "Somente alunos podem fazer pedidos."

        });

    }


    const usuarioId =
        req.session.usuario.id;


    const {
        horarioRetirada,
        itens
    } = req.body;


    if (!horarioRetirada) {

        return res.json({

            sucesso: false,

            mensagem:
                "Escolha um horário de retirada."

        });

    }


    if (
        !itens ||
        itens.length === 0
    ) {

        return res.json({

            sucesso: false,

            mensagem:
                "O carrinho está vazio."

        });

    }


    let total = 0;


    itens.forEach(item => {

        total +=
            Number(item.preco) *
            Number(item.quantidade);

    });


    const codigo =
        "FZ" +
        Math.floor(
            100000 +
            Math.random() * 900000
        );


    banco.run(

        `
        INSERT INTO pedidos
        (
            usuario_id,
            horario_retirada,
            total,
            status,
            codigo_retirada
        )

        VALUES (?, ?, ?, ?, ?)
        `,

        [
            usuarioId,
            horarioRetirada,
            total,
            "Recebido",
            codigo
        ],

        function(erro) {

            if (erro) {

                console.log(erro);

                return res.status(500).json({

                    sucesso: false,

                    mensagem:
                        "Erro ao criar pedido."

                });

            }


            const pedidoId =
                this.lastID;


            let processados = 0;


            itens.forEach(item => {

                banco.run(

                    `
                    INSERT INTO itens_pedido
                    (
                        pedido_id,
                        produto_id,
                        quantidade,
                        preco
                    )

                    VALUES (?, ?, ?, ?)
                    `,

                    [
                        pedidoId,
                        item.id,
                        item.quantidade,
                        item.preco
                    ],

                    (erroItem) => {

                        if (erroItem) {

                            console.log(
                                erroItem
                            );

                        }


                        processados++;


                        if (
                            processados ===
                            itens.length
                        ) {

                            res.json({

                                sucesso: true,

                                pedidoId:
                                    pedidoId,

                                codigo:
                                    codigo,

                                total:
                                    total

                            });

                        }

                    }

                );

            });

        }

    );

});


// ==================================================
// MEUS PEDIDOS - ALUNO
// ==================================================

app.get(
    "/api/meus-pedidos",
    (req, res) => {

        if (!req.session.usuario) {

            return res.status(401).json({

                mensagem:
                    "Você precisa estar logado."

            });

        }


        if (
            req.session.usuario.tipo !== "aluno"
        ) {

            return res.status(403).json({

                mensagem:
                    "Acesso permitido somente para alunos."

            });

        }


        const usuarioId =
            req.session.usuario.id;


        banco.all(

            `
            SELECT *

            FROM pedidos

            WHERE usuario_id = ?

            ORDER BY id DESC
            `,

            [usuarioId],

            (erro, pedidos) => {

                if (erro) {

                    console.log(erro);

                    return res.status(500).json({

                        mensagem:
                            "Erro ao buscar pedidos."

                    });

                }


                res.json(pedidos);

            }

        );

    }
);


// ==================================================
// TODOS OS PEDIDOS - CANTINA
// ==================================================

app.get(
    "/api/todos-pedidos",
    (req, res) => {

        if (!req.session.usuario) {

            return res.status(401).json({

                mensagem:
                    "Você precisa estar logado."

            });

        }


        if (
            req.session.usuario.tipo !== "cantina"
        ) {

            return res.status(403).json({

                mensagem:
                    "Acesso permitido somente para a cantina."

            });

        }


        banco.all(

            `
            SELECT

                pedidos.id,

                pedidos.horario_retirada,

                pedidos.total,

                pedidos.status,

                pedidos.codigo_retirada,

                pedidos.data_pedido,

                usuarios.nome,

                usuarios.matricula

            FROM pedidos

            INNER JOIN usuarios

            ON pedidos.usuario_id =
               usuarios.id

            ORDER BY pedidos.id DESC
            `,

            [],

            (erro, pedidos) => {

                if (erro) {

                    console.log(erro);

                    return res.status(500).json({

                        mensagem:
                            "Erro ao buscar pedidos."

                    });

                }


                res.json(pedidos);

            }

        );

    }
);


// ==================================================
// ALTERAR STATUS DO PEDIDO
// ==================================================

app.put(
    "/api/pedidos/:id/status",
    (req, res) => {

        if (!req.session.usuario) {

            return res.status(401).json({

                sucesso: false,

                mensagem:
                    "Você precisa estar logado."

            });

        }


        if (
            req.session.usuario.tipo !== "cantina"
        ) {

            return res.status(403).json({

                sucesso: false,

                mensagem:
                    "Somente a cantina pode alterar pedidos."

            });

        }


        const id =
            req.params.id;


        const { status } =
            req.body;


        const statusPermitidos = [

            "Recebido",

            "Em preparo",

            "Pronto",

            "Retirado"

        ];


        if (
            !statusPermitidos.includes(
                status
            )
        ) {

            return res.json({

                sucesso: false,

                mensagem:
                    "Status inválido."

            });

        }


        banco.run(

            `
            UPDATE pedidos

            SET status = ?

            WHERE id = ?
            `,

            [
                status,
                id
            ],

            function(erro) {

                if (erro) {

                    console.log(erro);

                    return res.status(500).json({

                        sucesso: false,

                        mensagem:
                            "Erro ao atualizar."

                    });

                }


                res.json({

                    sucesso: true

                });

            }

        );

    }
);


// ==================================================
// TODOS OS PRODUTOS - CANTINA
// ==================================================

app.get(
    "/api/todos-produtos",
    (req, res) => {

        if (!req.session.usuario) {

            return res.status(401).json({

                mensagem:
                    "Você precisa estar logado."

            });

        }


        if (
            req.session.usuario.tipo !== "cantina"
        ) {

            return res.status(403).json({

                mensagem:
                    "Somente a cantina pode acessar esta área."

            });

        }


        banco.all(

            `
            SELECT *

            FROM produtos

            ORDER BY categoria, nome
            `,

            [],

            (erro, produtos) => {

                if (erro) {

                    console.log(erro);

                    return res.status(500).json({

                        mensagem:
                            "Erro ao buscar produtos."

                    });

                }


                res.json(produtos);

            }

        );

    }
);


// ==================================================
// ADICIONAR PRODUTO
// ==================================================

app.post(
    "/api/produtos",
    (req, res) => {

        if (!req.session.usuario) {

            return res.status(401).json({

                sucesso: false,

                mensagem:
                    "Você precisa estar logado."

            });

        }


        if (
            req.session.usuario.tipo !== "cantina"
        ) {

            return res.status(403).json({

                sucesso: false,

                mensagem:
                    "Somente a cantina pode cadastrar produtos."

            });

        }


        const {
            nome,
            descricao,
            preco,
            categoria,
            imagem
        } = req.body;


        if (
            !nome ||
            !preco ||
            !categoria
        ) {

            return res.json({

                sucesso: false,

                mensagem:
                    "Preencha nome, preço e categoria."

            });

        }


        banco.run(

            `
            INSERT INTO produtos
            (
                nome,
                descricao,
                preco,
                categoria,
                imagem,
                disponivel
            )

            VALUES (?, ?, ?, ?, ?, 1)
            `,

            [
                nome,
                descricao || "",
                Number(preco),
                categoria,
                imagem || ""
            ],

            function(erro) {

                if (erro) {

                    console.log(erro);

                    return res.status(500).json({

                        sucesso: false,

                        mensagem:
                            "Erro ao cadastrar produto."

                    });

                }


                res.json({

                    sucesso: true,

                    id: this.lastID,

                    mensagem:
                        "Produto cadastrado com sucesso!"

                });

            }

        );

    }
);


// ==================================================
// EDITAR PRODUTO
// ==================================================

app.put(
    "/api/produtos/:id",
    (req, res) => {

        if (!req.session.usuario) {

            return res.status(401).json({

                sucesso: false,

                mensagem:
                    "Você precisa estar logado."

            });

        }


        if (
            req.session.usuario.tipo !== "cantina"
        ) {

            return res.status(403).json({

                sucesso: false,

                mensagem:
                    "Somente a cantina pode editar produtos."

            });

        }


        const id =
            req.params.id;


        const {
            nome,
            descricao,
            preco,
            categoria,
            imagem,
            disponivel
        } = req.body;


        banco.run(

            `
            UPDATE produtos

            SET

                nome = ?,

                descricao = ?,

                preco = ?,

                categoria = ?,

                imagem = ?,

                disponivel = ?

            WHERE id = ?
            `,

            [
                nome,
                descricao || "",
                Number(preco),
                categoria,
                imagem || "",
                disponivel ? 1 : 0,
                id
            ],

            function(erro) {

                if (erro) {

                    console.log(erro);

                    return res.status(500).json({

                        sucesso: false,

                        mensagem:
                            "Erro ao editar produto."

                    });

                }


                res.json({

                    sucesso: true,

                    mensagem:
                        "Produto atualizado com sucesso!"

                });

            }

        );

    }
);


// ==================================================
// EXCLUIR PRODUTO
// ==================================================

app.delete(
    "/api/produtos/:id",
    (req, res) => {

        if (!req.session.usuario) {

            return res.status(401).json({

                sucesso: false,

                mensagem:
                    "Você precisa estar logado."

            });

        }


        if (
            req.session.usuario.tipo !== "cantina"
        ) {

            return res.status(403).json({

                sucesso: false,

                mensagem:
                    "Somente a cantina pode excluir produtos."

            });

        }


        const id =
            req.params.id;


        banco.run(

            `
            DELETE FROM produtos

            WHERE id = ?
            `,

            [id],

            function(erro) {

                if (erro) {

                    console.log(erro);

                    return res.status(500).json({

                        sucesso: false,

                        mensagem:
                            "Erro ao excluir produto."

                    });

                }


                res.json({

                    sucesso: true,

                    mensagem:
                        "Produto excluído com sucesso!"

                });

            }

        );

    }
);


// ==================================================
// LOGOUT
// ==================================================

app.get("/logout", (req, res) => {

    req.session.destroy(() => {

        res.redirect("/login.html");

    });

});


// ==================================================
// SERVIDOR
// ==================================================

app.listen(
    PORTA,
    () => {

        console.log("");

        console.log(
            "=============================="
        );

        console.log(
            "FilaZero funcionando!"
        );

        console.log(
            `http://localhost:${PORTA}`
        );

        console.log(
            "=============================="
        );

    }
);