import React from 'react';
import { useI18n, type Lang } from '../../i18n';

type Part = string | { term: string; tip: string };
type Block =
  | { kind: 'p'; parts: Part[] }
  | { kind: 'formula'; formula: keyof typeof FORMULAS }
  | { kind: 'list'; items: Part[][] };
interface Section { title: string; blocks: Block[] }

/** Formulas are the same in both languages. */
const FORMULAS = {
  logReturn: <>r<sub>t</sub> = ln(P<sub>t</sub> / P<sub>t-1</sub>)</>,
  annualVol: <>σ<sub>ann</sub> = σ<sub>daily</sub> × √252</>,
  sharpe: <>max [ (w<sup>T</sup>μ − R<sub>f</sub>) / √(w<sup>T</sup>Σw) ]</>,
  prior: <>Π = δ Σ w<sub>mkt</sub></>,
  posterior: <>E[R] = [ (τΣ)<sup>-1</sup> + P<sup>T</sup>Ω<sup>-1</sup>P ]<sup>-1</sup> [ (τΣ)<sup>-1</sup>Π + P<sup>T</sup>Ω<sup>-1</sup>Q ]</>,
  gbm: <>S<sub>t</sub> = S<sub>t-1</sub> exp[ μ<sub>log</sub> dt + σ√dt Z ]</>,
  ledoitWolf: <>Σ<sub>LW</sub> = δ m I + (1 − δ) S,  m = tr(S) / n</>,
  riskParity: <>w<sub>i</sub> (Σw)<sub>i</sub> = w<sub>j</sub> (Σw)<sub>j</sub>  ∀ i, j</>,
  sortino: <>Sortino = (R<sub>p</sub> − R<sub>f</sub>) / σ<sub>down</sub>,  Calmar = R<sub>p</sub> / MDD</>,
  cost: <>C = |V| × (c + s / 2 + f<sub>x</sub>)</>,
};

const CONTENT: Record<Lang, { heading: string; subheading: string; sections: Section[] }> = {
  es: {
    heading: 'Metodología del motor cuantitativo',
    subheading: 'Documentación y fundamentos matemáticos',
    sections: [
      {
        title: '1. Origen de los datos',
        blocks: [
          { kind: 'p', parts: ['Los precios históricos se descargan de la API de ', { term: 'Yahoo Finance', tip: "Proveedor de datos financieros ampliamente usado. El servidor usa la librería 'yahoo-finance2'." }, '. El motor usa exclusivamente el ', { term: 'precio de cierre ajustado', tip: 'El cierre ajustado incorpora splits y dividendos, por lo que mide el retorno histórico total de forma exacta.' }, ' (Adj Close).'] },
          { kind: 'p', parts: ['El universo de activos son acciones, ETFs y ADRs que cotizan en EE. UU., más acciones chilenas con sufijo .SN, compatibles con brokers como Racional o Interactive Brokers.'] },
        ],
      },
      {
        title: '2. Motor estadístico',
        blocks: [
          { kind: 'p', parts: ['El retorno diario r', 'ₜ', ' se calcula como ', { term: 'retorno logarítmico', tip: 'Los retornos logarítmicos son simétricos y se suman en el tiempo, lo que los hace adecuados para modelar varios períodos.' }, ':'] },
          { kind: 'formula', formula: 'logReturn' },
          { kind: 'p', parts: ['A partir de ellos se obtienen el retorno esperado anualizado (promedio × 252) y la ', { term: 'volatilidad anualizada', tip: 'La volatilidad es la desviación estándar de los retornos. Se anualiza multiplicando por la raíz de 252, los días hábiles de un año.' }, ':'] },
          { kind: 'formula', formula: 'annualVol' },
          { kind: 'p', parts: ['También se calcula el retorno esperado según ', { term: 'CAPM', tip: 'Capital Asset Pricing Model: E(R) = Rf + β × (E(Rm) − Rf). Relaciona el riesgo sistemático con el retorno esperado.' }, ' para medir el desempeño propio de cada activo (alfa de Jensen) frente a su beta de mercado.'] },
        ],
      },
      {
        title: '3. Teoría moderna de portafolios (Markowitz)',
        blocks: [
          { kind: 'p', parts: ['El portafolio óptimo es el que ', { term: 'maximiza el ratio de Sharpe', tip: 'El ratio de Sharpe mide el retorno ajustado por riesgo: (retorno esperado − tasa libre de riesgo) / volatilidad. Su máximo es el portafolio tangente de la frontera eficiente.' }, ':'] },
          { kind: 'formula', formula: 'sharpe' },
          { kind: 'p', parts: ['Donde w son los pesos, μ los retornos esperados, Σ la matriz de covarianza y R', 'ᵨ', ' la tasa libre de riesgo. Maximizar el Sharpe se transforma en un problema cuadrático equivalente (Cornuéjols y Tütüncü) que se resuelve de forma exacta con el método de Goldfarb-Idnani, respetando las restricciones:'] },
          { kind: 'list', items: [
            [{ term: 'Totalmente invertido', tip: 'Los pesos suman exactamente 100 %; no hay apalancamiento.' }, ': Σ wᵢ = 1'],
            [{ term: 'Solo posiciones largas', tip: 'No se permiten ventas en corto: todos los pesos son positivos.' }, ': wᵢ ≥ 0'],
            [{ term: 'Límites por activo', tip: 'Mínimo (5 % por defecto, menos con más de 10 activos) y máximo configurables por activo en el panel de parámetros.' }, ': mínᵢ ≤ wᵢ ≤ máxᵢ'],
          ] },
        ],
      },
      {
        title: '4. Modelo de Black-Litterman (actualización bayesiana)',
        blocks: [
          { kind: 'p', parts: ['Para reducir la sensibilidad de Markowitz a los retornos históricos se usa el modelo de ', { term: 'Black-Litterman', tip: 'Combina los retornos de equilibrio del mercado (implícitos según CAPM) con las vistas del inversionista mediante inferencia bayesiana.' }, '. Primero se calculan los retornos implícitos de equilibrio (Π) por optimización inversa, con w_mkt igual a los pesos por capitalización de mercado (o pesos iguales si falta algún dato):'] },
          { kind: 'formula', formula: 'prior' },
          { kind: 'p', parts: ['Luego se incorporan tus vistas absolutas (matrices P y Q). La incertidumbre de cada vista (matriz diagonal Ω) se obtiene con el ', { term: 'método de Idzorek', tip: 'Traduce un porcentaje de confianza (0–100 %) en varianza estadística, sin que tengas que estimar varianzas a mano.' }, '. El retorno esperado posterior es:'] },
          { kind: 'formula', formula: 'posterior' },
        ],
      },
      {
        title: '5. Simulación de Monte Carlo y pruebas de estrés',
        blocks: [
          { kind: 'p', parts: ['Para proyectar el valor futuro y medir riesgos extremos se usa un ', { term: 'movimiento browniano geométrico', tip: 'Proceso estocástico en que el logaritmo del precio sigue un movimiento browniano.' }, ' con 10.000 trayectorias independientes del portafolio óptimo:'] },
          { kind: 'formula', formula: 'gbm' },
          { kind: 'p', parts: ['μ', 'ₗₒᵍ', ' es el promedio anualizado de los retornos logarítmicos (ya descuenta el efecto de la volatilidad) y Z es una normal estándar. De la distribución final se obtienen el ', { term: 'percentil 5 (valor en riesgo)', tip: 'Con 95 % de confianza, el portafolio terminará por sobre este valor.' }, ' y el percentil 95.'] },
        ],
      },
      {
        title: '6. Covarianza con contracción (Ledoit-Wolf)',
        blocks: [
          { kind: 'p', parts: ['Con pocos años de datos y muchos activos, la covarianza muestral S es ruidosa y el optimizador explota sus errores. Por defecto se usa la ', { term: 'contracción de Ledoit-Wolf', tip: 'Ledoit y Wolf (2004) calculan la intensidad δ que minimiza el error cuadrático esperado frente a la covarianza verdadera.' }, ', que mezcla S con un objetivo de varianza común:'] },
          { kind: 'formula', formula: 'ledoitWolf' },
          { kind: 'p', parts: ['La intensidad δ (entre 0 y 1) se estima de los propios datos y se muestra en la tabla comparativa. Las correlaciones mostradas siguen siendo las muestrales; puedes volver a la covarianza muestral en el panel de parámetros.'] },
        ],
      },
      {
        title: '7. Objetivos de optimización',
        blocks: [
          { kind: 'p', parts: ['Además del máximo Sharpe, el motor calcula tres portafolios alternativos y los compara lado a lado:'] },
          { kind: 'list', items: [
            [{ term: 'Mínima varianza', tip: 'Ignora los retornos esperados, que son la estimación más ruidosa, y minimiza solo el riesgo.' }, ': min wᵀΣw con las mismas restricciones.'],
            [{ term: 'Paridad de riesgo', tip: 'Equal Risk Contribution, resuelto por descenso coordenado cíclico (Spinu, 2013).' }, ': cada activo aporta la misma fracción del riesgo total:'],
            [{ term: 'HRP', tip: 'Hierarchical Risk Parity (López de Prado, 2016): agrupa los activos por correlación y reparte el capital por bisección recursiva, sin invertir la matriz de covarianza.' }, ': agrupamiento jerárquico (enlace simple) y reparto inverso a la varianza de cada grupo.'],
          ] },
          { kind: 'formula', formula: 'riskParity' },
          { kind: 'p', parts: ['Paridad de riesgo y HRP no admiten límites por activo de forma nativa, así que sus pesos se ', { term: 'proyectan a los límites', tip: 'Se recortan los pesos fuera de rango y la diferencia se reparte en proporción al margen que le queda a cada activo.' }, ' mínimo y máximo configurados.'] },
        ],
      },
      {
        title: '8. Métricas de riesgo de cola',
        blocks: [
          { kind: 'p', parts: ['El ', { term: 'ratio de Sortino', tip: 'Como el Sharpe, pero solo penaliza la volatilidad de los días bajo la tasa libre de riesgo.' }, ' y el ', { term: 'ratio de Calmar', tip: 'Retorno anualizado dividido por la máxima caída histórica.' }, ' complementan al Sharpe:'] },
          { kind: 'formula', formula: 'sortino' },
          { kind: 'p', parts: ['La ', { term: 'máxima caída', tip: 'La mayor pérdida desde un máximo previo hasta un mínimo posterior, con los pesos óptimos aplicados a la historia.' }, ' y los días hábiles que tardó en recuperar el máximo anterior se calculan sobre la serie histórica del portafolio.'] },
        ],
      },
      {
        title: '9. Costos de transacción',
        blocks: [
          { kind: 'p', parts: ['La calculadora de inversión estima el costo de cada compra o venta con la comisión del broker, la mitad del ', { term: 'spread', tip: 'Diferencia entre el precio de compra y de venta; al operar se paga en promedio la mitad.' }, ' y, cuando la moneda de pago difiere de la del activo (acciones .SN en CLP, el resto en USD), el costo de conversión (V es el monto operado, c la comisión, s el spread y fₓ el costo cambiario):'] },
          { kind: 'formula', formula: 'cost' },
        ],
      },
      {
        title: '6. Shrinkage covariance (Ledoit-Wolf)',
        blocks: [
          { kind: 'p', parts: ['With few years of data and many assets the sample covariance S is noisy and the optimizer exploits its errors. By default the engine uses ', { term: 'Ledoit-Wolf shrinkage', tip: 'Ledoit & Wolf (2004) derive the intensity δ that minimizes the expected squared error against the true covariance.' }, ', which blends S with a common-variance target:'] },
          { kind: 'formula', formula: 'ledoitWolf' },
          { kind: 'p', parts: ['The intensity δ (between 0 and 1) is estimated from the data itself and shown in the comparison table. Displayed correlations remain the sample ones; you can switch back to the sample covariance in the parameters panel.'] },
        ],
      },
      {
        title: '7. Optimization objectives',
        blocks: [
          { kind: 'p', parts: ['Besides maximum Sharpe, the engine builds three alternative portfolios and compares them side by side:'] },
          { kind: 'list', items: [
            [{ term: 'Minimum variance', tip: 'Ignores expected returns, the noisiest estimate, and minimizes risk alone.' }, ': min wᵀΣw under the same constraints.'],
            [{ term: 'Risk parity', tip: 'Equal Risk Contribution, solved by cyclical coordinate descent (Spinu, 2013).' }, ': every asset contributes the same share of total risk:'],
            [{ term: 'HRP', tip: 'Hierarchical Risk Parity (López de Prado, 2016): clusters assets by correlation and allocates by recursive bisection, without inverting the covariance matrix.' }, ': hierarchical clustering (single linkage) and inverse-variance allocation between clusters.'],
          ] },
          { kind: 'formula', formula: 'riskParity' },
          { kind: 'p', parts: ['Risk parity and HRP do not support per-asset bounds natively, so their weights are ', { term: 'projected onto the bounds', tip: 'Out-of-range weights are clipped and the gap is spread in proportion to the room each asset has left.' }, ' you configured.'] },
        ],
      },
      {
        title: '8. Tail-risk metrics',
        blocks: [
          { kind: 'p', parts: ['The ', { term: 'Sortino ratio', tip: 'Like Sharpe, but only penalizes volatility on days below the risk-free rate.' }, ' and the ', { term: 'Calmar ratio', tip: 'Annualized return divided by the maximum historical drawdown.' }, ' complement Sharpe:'] },
          { kind: 'formula', formula: 'sortino' },
          { kind: 'p', parts: ['The ', { term: 'maximum drawdown', tip: 'The largest loss from a previous peak to a later trough, applying the optimal weights to history.' }, ' and the trading days it took to regain the previous peak are computed on the portfolio\'s historical series.'] },
        ],
      },
      {
        title: '9. Transaction costs',
        blocks: [
          { kind: 'p', parts: ['The investment calculator estimates the cost of each buy or sell from the broker commission, half the ', { term: 'spread', tip: 'Gap between bid and ask prices; on average a trade pays half of it.' }, ' and, when the payment currency differs from the asset\'s (.SN stocks in CLP, the rest in USD), the conversion cost (V is the traded amount, c the commission, s the spread and fₓ the FX cost):'] },
          { kind: 'formula', formula: 'cost' },
        ],
      },
    ],
  },
  en: {
    heading: 'Quantitative engine methodology',
    subheading: 'Documentation & mathematical foundations',
    sections: [
      {
        title: '1. Data provenance & ingestion',
        blocks: [
          { kind: 'p', parts: ['Historical prices come from the ', { term: 'Yahoo Finance', tip: "A widely used financial data provider. The server uses the 'yahoo-finance2' library." }, ' API. The engine relies exclusively on the ', { term: 'Adjusted Close', tip: 'The adjusted close accounts for splits and dividends, giving an accurate measure of total historical return.' }, ' (Adj Close) series.'] },
          { kind: 'p', parts: ['The asset universe covers US-listed equities, ETFs and ADRs, plus Chilean stocks with the .SN suffix, compatible with brokers such as Racional or Interactive Brokers.'] },
        ],
      },
      {
        title: '2. Core statistical engine',
        blocks: [
          { kind: 'p', parts: ['The daily return is computed as the ', { term: 'logarithmic return', tip: 'Log returns are symmetric and time-additive, which suits multi-period modeling.' }, ':'] },
          { kind: 'formula', formula: 'logReturn' },
          { kind: 'p', parts: ['From them we derive the annualized expected return (mean × 252) and the ', { term: 'annualized volatility', tip: 'Volatility is the standard deviation of returns, annualized with the square root of 252 trading days.' }, ':'] },
          { kind: 'formula', formula: 'annualVol' },
          { kind: 'p', parts: ['The ', { term: 'CAPM', tip: 'Capital Asset Pricing Model: E(R) = Rf + β × (E(Rm) − Rf). It links systematic risk to expected return.' }, ' expected return is also computed to measure each asset\'s own performance (Jensen\'s alpha) against its market beta.'] },
        ],
      },
      {
        title: '3. Modern portfolio theory (Markowitz)',
        blocks: [
          { kind: 'p', parts: ['The optimal portfolio is the one that ', { term: 'maximizes the Sharpe ratio', tip: 'The Sharpe ratio measures risk-adjusted return: (expected return − risk-free rate) / volatility. Its maximum is the tangency portfolio on the efficient frontier.' }, ':'] },
          { kind: 'formula', formula: 'sharpe' },
          { kind: 'p', parts: ['Where w are the weights, μ the expected returns, Σ the covariance matrix and R', 'ᵨ', ' the risk-free rate. Maximizing the Sharpe ratio is turned into an equivalent quadratic program (Cornuéjols & Tütüncü) and solved exactly with the Goldfarb-Idnani method, subject to the constraints:'] },
          { kind: 'list', items: [
            [{ term: 'Fully invested', tip: 'Weights add up to exactly 100%; no leverage.' }, ': Σ wᵢ = 1'],
            [{ term: 'Long-only', tip: 'No short selling: every weight is positive.' }, ': wᵢ ≥ 0'],
            [{ term: 'Per-asset bounds', tip: 'Minimum (5% by default, less with more than 10 assets) and maximum set per asset in the parameters panel.' }, ': minᵢ ≤ wᵢ ≤ maxᵢ'],
          ] },
        ],
      },
      {
        title: '4. Black-Litterman model (Bayesian updating)',
        blocks: [
          { kind: 'p', parts: ['To reduce Markowitz\'s sensitivity to historical returns, the ', { term: 'Black-Litterman', tip: 'Combines market equilibrium returns (implied by CAPM) with investor views using Bayesian inference.' }, ' model is used. Implied equilibrium returns (Π) come from reverse optimization, with w_mkt set to market-cap weights (or equal weights when any cap is missing):'] },
          { kind: 'formula', formula: 'prior' },
          { kind: 'p', parts: ['Your absolute views (P and Q matrices) are then added. The uncertainty of each view (diagonal Ω matrix) comes from ', { term: "Idzorek's method", tip: 'Translates a confidence percentage (0–100%) into statistical variance, so you do not need to estimate variances by hand.' }, '. The posterior expected return is:'] },
          { kind: 'formula', formula: 'posterior' },
        ],
      },
      {
        title: '5. Monte Carlo simulation & stress testing',
        blocks: [
          { kind: 'p', parts: ['To project future wealth and measure tail risk, a ', { term: 'geometric Brownian motion', tip: 'A stochastic process where the logarithm of the price follows a Brownian motion.' }, ' simulates 10,000 independent paths of the optimal portfolio:'] },
          { kind: 'formula', formula: 'gbm' },
          { kind: 'p', parts: ['μ', 'ₗₒᵍ', ' is the annualized mean of log returns (it already accounts for volatility drag) and Z is a standard normal draw. The terminal distribution gives the ', { term: '5th percentile (value at risk)', tip: 'With 95% confidence the portfolio ends above this value.' }, ' and the 95th percentile.'] },
        ],
      },
    ],
  },
};

function renderParts(parts: Part[]) {
  return parts.map((part, i) =>
    typeof part === 'string'
      ? <React.Fragment key={i}>{part}</React.Fragment>
      : <span key={i} className="cursor-help font-semibold text-blue-800 underline decoration-dotted" title={part.tip}>{part.term}</span>
  );
}

/** Full-screen whitepaper describing the data pipeline and the math behind each model. */
export function MethodologyModal({ onClose }: { onClose: () => void }) {
  const { lang, t } = useI18n();
  const content = CONTENT[lang];
  return (
    <div className="fixed inset-0 z-50 bg-paper flex flex-col font-sans overflow-hidden" role="dialog" aria-modal="true">
      <div className="flex justify-between items-center gap-4 bg-ink text-paper p-4 border-b border-zinc-800 shrink-0">
        <div>
          <h2 className="text-base sm:text-lg font-bold tracking-tighter">{t('method.title')}</h2>
          <p className="text-[10px] font-mono uppercase text-zinc-400 mt-1">{t('method.subtitle')}</p>
        </div>
        <button onClick={onClose} className="text-paper bg-zinc-800 hover:bg-zinc-700 px-3 py-1 font-mono text-xs transition-colors shrink-0">
          {t('method.close')}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 sm:p-8 lg:p-12">
        <div className="max-w-4xl mx-auto bg-white border border-ink p-5 sm:p-8 lg:p-16 shadow-2xl">
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-ink mb-4 text-center">{content.heading}</h1>
          <p className="text-sm font-mono text-center text-zinc-500 mb-12 border-b border-zinc-200 pb-8">{content.subheading}</p>

          <div className="space-y-12 text-ink font-serif leading-relaxed">
            {content.sections.map(section => (
              <section key={section.title}>
                <h2 className="text-lg sm:text-xl font-bold font-sans uppercase tracking-tight mb-4 border-l-4 border-ink pl-4">{section.title}</h2>
                {section.blocks.map((block, i) => {
                  if (block.kind === 'formula') {
                    return <div key={i} className="bg-zinc-50 p-4 sm:p-6 border border-zinc-200 text-center font-mono my-4 text-sm sm:text-lg overflow-x-auto">{FORMULAS[block.formula]}</div>;
                  }
                  if (block.kind === 'list') {
                    return <ul key={i} className="list-disc pl-6 space-y-2 mb-4">{block.items.map((item, j) => <li key={j}>{renderParts(item)}</li>)}</ul>;
                  }
                  return <p key={i} className="mb-4">{renderParts(block.parts)}</p>;
                })}
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
