import type { Page, Story } from "@/types/story";

const IMG = (n: string) => `/samples/bento/images/${n}`;
const AUD = (i: number) =>
  `/samples/bento/audio/page-${String(i).padStart(2, "0")}.mp3`;

const cover = IMG("01-cover.jpg");
const meadow = IMG("02-meadow.jpg");
const path = IMG("03-path.jpg");
const archway = IMG("04-archway.jpg");
const orchard = IMG("05-orchard.jpg");
const fruitGlow = IMG("06-fruit-glow.jpg");
const lookingUp = IMG("07-looking-up.jpg");
const olivia = IMG("08-olivia.jpg");
const together = IMG("09-together.jpg");
const climbing = IMG("10-climbing.jpg");
const goldenHour = IMG("11-golden-hour.jpg");
const listening = IMG("12-listening.jpg");
const birds = IMG("13-birds.jpg");
const ending = IMG("14-ending.jpg");

type Seed = Omit<Page, "index" | "audio_url">;

const SEEDS: Seed[] = [
  { text: "Bento e o Pomar das Canções", image_url: cover, layout: "cover" },
  {
    text: "Numa manhã de luz dourada,\no ursinho Bento acordou\ncom um zumbido baixinho\nfazendo cócegas no nariz.",
    image_url: meadow,
    layout: "bg-image-text-card",
    text_position: "bottom",
  },
  {
    text: "— Hum… que som é esse?\nperguntou ele, espreguiçando.\nO vento respondeu com um sopro\nque cheirava a frutas maduras.",
    image_url: meadow,
    layout: "top-image",
    text_position: "bottom",
  },
  {
    text: "Bento amarrou o cachecol amarelo\ne seguiu, devagarinho,\npela trilha onde as margaridas\nse curvavam para cumprimentar.",
    image_url: path,
    layout: "wide-scene-soft-block",
    text_position: "bottom",
  },
  {
    text: "A cada passo, o zumbido\nficava um pouquinho maior,\ncomo se alguém cantarolasse\ndentro das folhas.",
    image_url: path,
    layout: "bg-image-text-card",
    text_position: "top",
  },
  {
    text: "Logo ele chegou a um portal\nfeito de galhos enroscados,\ncoberto de flores brancas\ne luzinhas tremulantes.",
    image_url: archway,
    layout: "full-art-footer-text",
    text_position: "bottom",
  },
  {
    text: "Bento respirou fundo\ne atravessou o portal.\nDo outro lado, havia um pomar\nque ele nunca tinha visto antes.",
    image_url: orchard,
    layout: "wide-scene-soft-block",
    text_position: "bottom",
  },
  {
    text: "As árvores eram altas e tortinhas,\ncom frutas redondas pendurando\ncomo pequenas lanternas\nem tons de pêssego e mel.",
    image_url: orchard,
    layout: "bg-image-text-card",
    text_position: "bottom",
  },
  {
    text: "E cada fruta… cantava.\nUma cantava em pio,\noutra em sussurro,\noutra em risadinha.",
    image_url: fruitGlow,
    layout: "center-character",
    text_position: "bottom",
  },
  {
    text: "Bento parou, encantado.\nNunca tinha ouvido nada assim.\nFicou só escutando,\nde olhos bem arregalados.",
    image_url: lookingUp,
    layout: "bg-image-text-card",
    text_position: "bottom",
  },
  {
    text: "— Bom dia, viajantezinho.\ndisse uma voz mansa atrás dele.\nEra Dona Olívia, a tartaruga,\ncom seus óculos redondos.",
    image_url: olivia,
    layout: "top-image",
    text_position: "bottom",
  },
  {
    text: "— A senhora… ouviu o canto?\nperguntou Bento, baixinho.\n— Ouço todos os dias,\nrespondeu Dona Olívia, sorrindo.",
    image_url: together,
    layout: "bg-image-text-card",
    text_position: "bottom",
  },
  {
    text: "— Mas falta uma canção.\nA mais antiga de todas.\nMinha avó cantava pra mim,\ne eu já não lembro direito.",
    image_url: olivia,
    layout: "center-character",
    text_position: "bottom",
  },
  {
    text: "Bento coçou a orelha,\npensativo. Depois disse:\n— E se a gente escutar\ncada fruta, uma de cada vez?",
    image_url: together,
    layout: "bg-image-text-card",
    text_position: "top",
  },
  {
    text: "Dona Olívia concordou.\nBento subiu, com cuidado,\npor um galho largo e firme,\nque parecia feito pra ele.",
    image_url: climbing,
    layout: "wide-scene-soft-block",
    text_position: "bottom",
  },
  {
    text: "Aproximou o ouvido\nde uma fruta cor de damasco.\nEla cantou três notinhas\ne ficou em silêncio.",
    image_url: fruitGlow,
    layout: "bg-image-text-card",
    text_position: "bottom",
  },
  {
    text: "Depois, uma fruta dourada\nsoltou um “lá-lá-lá” quentinho.\nE outra, bem pequenininha,\nfez um “hum” bem comprido.",
    image_url: fruitGlow,
    layout: "center-character",
    text_position: "bottom",
  },
  {
    text: "Bento foi guardando os sons\nlá dentro do peito,\ncomo quem guarda figurinhas\nnum álbum bem amado.",
    image_url: climbing,
    layout: "bg-image-text-card",
    text_position: "bottom",
  },
  {
    text: "Quando o sol começou a descer,\no pomar inteiro brilhava\nnum laranja macio,\ncomo se estivesse cochilando.",
    image_url: goldenHour,
    layout: "full-art-footer-text",
    text_position: "bottom",
  },
  {
    text: "Bento desceu do galho\ne foi até Dona Olívia.\nEntão, juntinho dela,\ncomeçou a cantarolar.",
    image_url: together,
    layout: "wide-scene-soft-block",
    text_position: "bottom",
  },
  {
    text: "Uma notinha de damasco,\num “lá-lá-lá” dourado,\num “hum” bem pequenininho…\ne mais um, e mais outro.",
    image_url: listening,
    layout: "bg-image-text-card",
    text_position: "bottom",
  },
  {
    text: "Dona Olívia fechou os olhos.\nSeu lencinho azul tremeu.\n— É essa… é essa mesmo,\nsussurrou ela, emocionada.",
    image_url: listening,
    layout: "center-character",
    text_position: "bottom",
  },
  {
    text: "A canção da avó dela\nvoltou inteirinha,\ncomo um passarinho\nque encontrou o caminho de casa.",
    image_url: birds,
    layout: "wide-scene-soft-block",
    text_position: "bottom",
  },
  {
    text: "Pelos galhos do pomar,\nbichinhos pequenos pararam.\nUm sabiá, dois caracóis,\ne até um besouro tímido.",
    image_url: birds,
    layout: "bg-image-text-card",
    text_position: "bottom",
  },
  {
    text: "Todos ouviram, em silêncio,\na velha canção de novo.\nE o pomar inteiro\npareceu respirar fundo.",
    image_url: goldenHour,
    layout: "bg-image-text-card",
    text_position: "bottom",
  },
  {
    text: "— Obrigada, Bento.\ndisse Dona Olívia, baixinho.\n— Você me ensinou de novo\na escutar com paciência.",
    image_url: ending,
    layout: "bg-image-text-card",
    text_position: "bottom",
  },
  {
    text: "Bento sorriu, todo quentinho\npor dentro do cachecol.\nGuardou as notinhas no peito\ne voltou pela trilha das margaridas.",
    image_url: ending,
    layout: "wide-scene-soft-block",
    text_position: "bottom",
  },
  {
    text: "E assim Bento descobriu\nque, às vezes, as coisas mais bonitas\naparecem devagarinho,\npara quem sabe escutar.\n\nFim.",
    image_url: ending,
    layout: "minimal-final",
    text_position: "middle",
  },
];

export function buildBentoSample(): Story {
  const id =
    (typeof crypto !== "undefined" && "randomUUID" in crypto && crypto.randomUUID()) ||
    `tmp-${Date.now()}`;
  const today = new Date().toISOString().slice(0, 10);
  const pages: Page[] = SEEDS.map((s, i) => ({
    ...s,
    index: i,
    audio_url: AUD(i + 1),
  }));
  return {
    id,
    title: "Bento e o Pomar das Canções",
    subtitle: "Uma pequena aventura sobre escutar",
    date: today,
    emoji: "🐻",
    tags: ["sono", "escutar", "pomar", "animais"],
    cover_url: cover,
    pages,
  };
}
