const lista =
    document.getElementById("listaPedido");

const totalElemento =
    document.getElementById("total");


let carrinho =
    JSON.parse(
        localStorage.getItem("carrinho")
    ) || [];



function carregarPedido() {

    if (carrinho.length === 0) {

        lista.innerHTML = `

            <div class="mensagem-vazia">

                <h3>
                    Seu carrinho está vazio.
                </h3>

                <a href="cardapio.html">
                    Voltar ao cardápio
                </a>

            </div>

        `;

        return;

    }


    lista.innerHTML = "";


    let total = 0;


    carrinho.forEach((item, index) => {

        const subtotal =
            item.preco *
            item.quantidade;


        total += subtotal;


        const div =
            document.createElement("div");


        div.className =
            "item-pedido";


        div.innerHTML = `

            <div>

                <h3>
                    ${item.nome}
                </h3>

                <p>
                    R$ ${item.preco
                        .toFixed(2)
                        .replace(".", ",")}
                </p>

            </div>


            <div class="quantidade">

                <button
                    onclick="diminuir(${index})"
                >
                    −
                </button>


                <strong>
                    ${item.quantidade}
                </strong>


                <button
                    onclick="aumentar(${index})"
                >
                    +
                </button>

            </div>


            <strong>

                R$ ${subtotal
                    .toFixed(2)
                    .replace(".", ",")}

            </strong>

        `;


        lista.appendChild(div);

    });


    totalElemento.textContent =
        `R$ ${total
            .toFixed(2)
            .replace(".", ",")}`;

}



function aumentar(index) {

    carrinho[index].quantidade++;

    salvar();

}



function diminuir(index) {

    carrinho[index].quantidade--;


    if (
        carrinho[index].quantidade <= 0
    ) {

        carrinho.splice(index, 1);

    }


    salvar();

}



function salvar() {

    localStorage.setItem(
        "carrinho",
        JSON.stringify(carrinho)
    );


    carregarPedido();

}



async function confirmarPedido() {

    if (carrinho.length === 0) {

        alert(
            "Seu carrinho está vazio."
        );

        return;

    }


    const horario =
        document.getElementById(
            "horario"
        ).value;


    if (!horario) {

        alert(
            "Escolha um horário de retirada."
        );

        return;

    }


    const botao =
        document.getElementById(
            "confirmar"
        );


    botao.disabled = true;

    botao.textContent =
        "Enviando...";


    try {

        const resposta =
            await fetch(
                "/api/pedidos",
                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body: JSON.stringify({

                        horarioRetirada:
                            horario,

                        itens:
                            carrinho

                    })

                }
            );


        const dados =
            await resposta.json();


        if (!dados.sucesso) {

            alert(
                dados.mensagem
            );

            botao.disabled = false;

            botao.textContent =
                "Confirmar pedido";

            return;

        }


        localStorage.removeItem(
            "carrinho"
        );


        alert(
            `Pedido realizado com sucesso!\n\nCódigo: ${dados.codigo}`
        );


        window.location.href =
            "meus-pedidos.html";


    } catch (erro) {

        console.log(erro);

        alert(
            "Não foi possível enviar o pedido."
        );


        botao.disabled = false;

        botao.textContent =
            "Confirmar pedido";

    }

}


carregarPedido();