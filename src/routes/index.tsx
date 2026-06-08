import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Share2,
  ShoppingCart,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  Truck,
  Store,
  MessageCircle,
  Package,
  Star,
} from "lucide-react";

const checkoutLinks = {
  "127V": "https://seguro.beldermeebr.shop/api/public/shopify?product=45663239667795&store=28505",
  "220V": "https://seguro.beldermeebr.shop/api/public/shopify?product=45663239700563&store=28505",
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fritadeira Air Fryer Forno Oven 12L Mondial 2000W AFON-12L-BI" },
      {
        name: "description",
        content:
          "Fritadeira Air Fryer Forno Oven 12L Mondial 2000W AFON-12L-BI com tecnologia de ar quente. Prepara alimentos crocantes com pouco ou nenhum óleo.",
      },
      {
        property: "og:title",
        content: "Fritadeira Air Fryer Forno Oven 12L Mondial 2000W AFON-12L-BI",
      },
      {
        property: "og:description",
        content:
          "Fritadeira Air Fryer Forno Oven 12L Mondial 2000W AFON-12L-BI — sem óleo, 2000W, múltiplas funções.",
      },
      {
        property: "og:image",
        content: "https://pontoquente.site/products/14e72136cf1148d7.jpg",
      },
    ],
  }),
  component: ProductPage,
});

const productImages = [
  "https://pontoquente.site/products/14e72136cf1148d7.jpg",
  "https://pontoquente.site/products/a1d70b390d491fe5.jpg",
  "https://pontoquente.site/products/2c2b6704b34cdb55.jpg",
  "https://pontoquente.site/products/5f2fee7ef3020c02.jpg",
  "https://pontoquente.site/products/4e21f78c705a2974.jpg",
  "https://pontoquente.site/products/307455df82c34ea1.jpg",
  "https://pontoquente.site/products/3228afa7905edeed.jpg",
  "https://pontoquente.site/products/9edbac50ff146860.jpg",
  "https://pontoquente.site/products/daccea4b27f86774.jpg",
];

const reviews = [
  {
    initial: "A",
    name: "Ana Carolina S.",
    date: "12/03/2026",
    title: "Superou expectativas!",
    text: "Comprei desconfiada e me surpreendi. Assa frango inteiro com a pele crocante e por dentro suculento. Vale cada centavo.",
    photo: "https://pontoquente.site/reviews/mondial-12l-cozinha.webp",
  },
  {
    initial: "R",
    name: "Roberto M.",
    date: "28/02/2026",
    title: "Excelente custo-benefício",
    text: "Substituiu meu micro-ondas e o forno elétrico antigo. Os 12L cabem muita coisa, fiz pizza, lasanha e batata frita sem óleo.",
  },
  {
    initial: "J",
    name: "Juliana P.",
    date: "15/02/2026",
    title: "Muito boa, só pesa um pouco",
    text: "Funciona perfeitamente, fácil de limpar. Único ponto é que é mais pesada do que imaginei, mas nada que atrapalhe.",
    photo: "https://pontoquente.site/reviews/mondial-12l-aberta-grades.webp",
  },
  {
    initial: "C",
    name: "Carlos Eduardo",
    date: "02/02/2026",
    title: "Recomendo demais",
    text: "Chegou rápido, bem embalado. A potência de 2000W faz diferença, esquenta rapidinho e a comida fica uniforme.",
  },
  {
    initial: "P",
    name: "Patrícia L.",
    date: "20/01/2026",
    title: "Melhor compra do ano",
    text: "Já fiz pão, bolo, frango assado, batata e até brigadeiro de colher. As funções múltiplas realmente funcionam.",
    photo: "https://pontoquente.site/reviews/mondial-12l-aberta.webp",
  },
];

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `00:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

function ProductPage() {
  const [index, setIndex] = useState(0);
  const [voltage, setVoltage] = useState<"127V" | "220V" | null>(null);
  const [seconds, setSeconds] = useState(59 * 60 + 56);

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);

  const prev = () => setIndex((i) => (i === 0 ? productImages.length - 1 : i - 1));
  const next = () => setIndex((i) => (i === productImages.length - 1 ? 0 : i + 1));

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <div className="mx-auto max-w-[480px] pb-28">
        {/* Top bar */}
        <header className="flex items-center justify-between px-4 py-3">
          <button aria-label="Voltar" className="p-1">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div className="flex items-center gap-4">
            <button aria-label="Compartilhar" className="p-1">
              <Share2 className="h-5 w-5" />
            </button>
            <button aria-label="Carrinho" className="p-1">
              <ShoppingCart className="h-5 w-5" />
            </button>
            <button aria-label="Mais" className="p-1">
              <MoreVertical className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Breadcrumb */}
        <div className="px-4 pb-2 text-sm">
          <span className="text-sky-600">Início</span>
          <span className="mx-1 text-neutral-400">/</span>
          <span className="text-sky-600">Air Fryers</span>
        </div>

        {/* Gallery */}
        <div className="relative">
          <div className="flex h-[360px] items-center justify-center bg-white px-6">
            <img
              src={productImages[index]}
              alt="Fritadeira Air Fryer Forno Oven 12L Mondial"
              className="max-h-full max-w-full object-contain"
            />
          </div>
          <button
            onClick={prev}
            aria-label="Anterior"
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-1 shadow"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={next}
            aria-label="Próxima"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-1 shadow"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="mt-2 flex justify-center gap-1.5 pb-2">
            {productImages.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-4 bg-sky-500" : "w-1.5 bg-neutral-300"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Shipping badge */}
        <div className="flex items-center gap-2 px-4 py-2 text-sm">
          <span className="rounded-md bg-emerald-500 px-1.5 py-0.5 text-xs font-bold text-white">
            BR
          </span>
          <span className="font-medium text-emerald-700">ENVIO NACIONAL</span>
          <span className="text-neutral-500">15.842 vendidos</span>
        </div>

        {/* Price banner */}
        <div className="mx-4 mt-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-400 px-4 py-3 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="rounded bg-red-600 px-1.5 py-0.5 text-[11px] font-bold">
                -94%
              </span>
              <div className="leading-tight">
                <div className="text-xs line-through opacity-80">R$ 1.299,00</div>
                <div className="text-2xl font-extrabold">
                  R$ <span className="text-3xl">69,90</span>
                </div>
              </div>
            </div>
            <div className="text-right text-xs leading-tight">
              <div className="font-semibold">⚡ Oferta Relâmpago</div>
              <div>Termina em {formatTime(seconds)}</div>
            </div>
          </div>
        </div>

        {/* Bonus pills */}
        <div className="flex flex-wrap gap-2 px-4 py-3 text-xs">
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-rose-600">
            🎁 Economize R$ 1.226,60
          </span>
          <span className="rounded-full bg-rose-50 px-2.5 py-1 text-rose-600">
            Economize 94% com bônus
          </span>
        </div>

        {/* Title + brand + rating */}
        <div className="px-4">
          <div className="text-xs uppercase tracking-wide text-neutral-500">Mondial</div>
          <h1 className="mt-1 text-lg font-semibold leading-snug">
            Fritadeira Air Fryer Forno Oven 12L Mondial 2000W AFON-12L-BI
          </h1>
          <div className="mt-2 flex items-center gap-2 text-sm">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            <span className="font-semibold">4.6</span>
            <span className="text-sky-600">(50)</span>
            <span className="text-neutral-400">|</span>
            <span className="text-neutral-600">15.842 vendidos</span>
            <button aria-label="Salvar" className="ml-auto">
              <Bookmark className="h-5 w-5 text-neutral-400" />
            </button>
          </div>
        </div>

        {/* Voltage */}
        <div className="px-4 pt-5">
          <div className="text-sm">
            <span className="font-semibold">Voltagem:</span>{" "}
            <span className="text-neutral-500">{voltage ?? "selecione"}</span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-3">
            {(["127V", "220V"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setVoltage(v)}
                className={`rounded-md border py-2.5 text-sm font-semibold transition ${
                  voltage === v
                    ? "border-sky-500 bg-sky-50 text-sky-700"
                    : "border-neutral-300 bg-white hover:border-neutral-400"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Delivery */}
        <div className="mx-4 mt-5 rounded-lg border border-neutral-200 p-3 text-sm">
          <div className="flex items-start gap-2">
            <Truck className="mt-0.5 h-5 w-5 text-sky-600" />
            <div>
              <div>
                Receba até <span className="font-semibold">8 de jun – 13 de jun</span>
              </div>
              <div className="mt-0.5 text-neutral-500 line-through">
                Taxa de envio: R$ 9,60
              </div>
              <div className="font-semibold text-emerald-600">
                Frete Grátis neste produto 🎉
              </div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-neutral-600">
            <div>✓ Devoluções gratuitas em 30 dias</div>
            <div>✓ Cancelamento fácil</div>
          </div>
        </div>

        {/* About */}
        <section className="px-4 pt-6">
          <h2 className="text-base font-bold">Sobre o produto</h2>
          <p className="mt-2 text-sm leading-relaxed text-neutral-700">
            Fritadeira Air Fryer Forno Oven 12L Mondial 2000W AFON-12L-BI — fritadeira
            sem óleo Mondial com tecnologia de ar quente. Prepara alimentos crocantes
            com pouco ou nenhum óleo, controle de temperatura, timer e múltiplas
            funções para assar, grelhar e desidratar.
          </p>

          <h3 className="mt-4 text-sm font-semibold">Especificações técnicas</h3>
          <ul className="mt-2 divide-y divide-neutral-200 rounded-lg border border-neutral-200 text-sm">
            {[
              ["Capacidade", "12 Litros"],
              ["Potência", "2000 W"],
              ["Funções", "Forno + Air Fryer"],
              ["Controle", "Digital com timer"],
              ["Marca", "Mondial"],
              ["Modelo", "AFON-12L-BI"],
            ].map(([k, v]) => (
              <li key={k} className="flex justify-between px-3 py-2">
                <span className="text-neutral-500">{k}</span>
                <span className="font-medium">{v}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Reviews */}
        <section className="px-4 pt-8">
          <div className="flex items-baseline justify-between">
            <h2 className="text-base font-bold">Avaliações dos clientes (50)</h2>
            <div className="text-sm font-semibold">
              4.6<span className="text-neutral-400">/5</span>
            </div>
          </div>

          <div className="mt-4 space-y-5">
            {reviews.map((r) => (
              <div key={r.name} className="border-b border-neutral-100 pb-5 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-sm font-bold text-sky-700">
                    {r.initial}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{r.name}</div>
                    <div className="text-xs text-neutral-500">{r.date}</div>
                  </div>
                  <div className="ml-auto flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                </div>
                <div className="mt-2 text-sm font-semibold">{r.title}</div>
                <p className="mt-1 text-sm text-neutral-700">{r.text}</p>
                {r.photo && (
                  <img
                    src={r.photo}
                    alt="Foto do cliente"
                    className="mt-2 h-24 w-24 rounded-lg object-cover"
                  />
                )}
              </div>
            ))}
          </div>

          <button className="mt-4 w-full rounded-md border border-neutral-300 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50">
            Ver mais 45 avaliações
          </button>
        </section>

        {/* Store */}
        <section className="mx-4 mt-8 rounded-xl border border-neutral-200 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 font-bold text-orange-600">
              PQ
            </div>
            <div>
              <div className="text-sm font-semibold">Ponto Quente</div>
              <div className="text-xs text-neutral-500">312 produtos</div>
            </div>
            <button className="ml-auto rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white">
              Seguir
            </button>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-neutral-600">
            A Mondial é uma das marcas mais reconhecidas do Brasil em eletrodomésticos.
            Com décadas de história, a marca é referência em qualidade, inovação e
            preço acessível, oferecendo fritadeiras, micro-ondas, panelas elétricas e
            muito mais. No Ponto Quente, você encontra os melhores eletrodomésticos
            Mondial com preços imbatíveis e frete grátis para todo Brasil.
          </p>
        </section>

        {/* Recent purchase toast */}
        <div className="fixed bottom-20 left-1/2 z-40 w-[92%] max-w-[440px] -translate-x-1/2 rounded-xl border border-neutral-200 bg-white p-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100">
              <Package className="h-5 w-5 text-orange-600" />
            </div>
            <div className="text-xs">
              <div className="font-semibold">Patrícia A. acabou de comprar!</div>
              <div className="text-neutral-500">Fortaleza, CE • há 2 min</div>
              <div className="text-emerald-600">✓ Aguardando envio</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-1/2 z-50 w-full max-w-[480px] -translate-x-1/2 border-t border-neutral-200 bg-white px-3 py-2">
        <div className="flex items-center gap-2">
          <button className="flex flex-col items-center text-[10px] text-neutral-600">
            <Store className="h-5 w-5" />
            Loja
          </button>
          <button className="flex flex-col items-center text-[10px] text-neutral-600">
            <MessageCircle className="h-5 w-5" />
            Chat
          </button>
          <button className="ml-1 flex-1 rounded-full border border-neutral-900 py-2.5 text-center text-sm font-semibold">
            Adicionar ao carrinho
          </button>
          <a
            href={voltage ? checkoutLinks[voltage] : "#"}
            onClick={(e) => {
              if (!voltage) {
                e.preventDefault();
                alert("Selecione a voltagem (127V ou 220V) antes de comprar.");
              }
            }}
            className="flex-1 rounded-full bg-rose-500 py-2.5 text-center text-sm font-semibold text-white"
          >
            Comprar agora
            <div className="text-[11px] font-normal opacity-90">R$ 69,90</div>
          </a>
        </div>
      </div>
    </div>
  );
}
