/** Carrega o estado da semana 1 (dados/estado-inicial.json) se o banco estiver vazio. */
import { garantirSeed } from "../src/servidor/nucleo";
garantirSeed().then((c) => process.stdout.write(`Banco pronto. Semana ${c.campanha.semana}.\n`));
