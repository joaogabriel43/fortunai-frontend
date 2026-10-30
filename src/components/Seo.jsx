import { useEffect } from 'react'
import { SITE_URL } from '../seo/paginas'

/**
 * Metadados de SEO da rota, com as tags nativas do React 19 (<title>, <meta>, <link>
 * são içadas para o <head> automaticamente — sem react-helmet).
 *
 * O index.html traz título, description, og e twitter padrão (marcados com data-seo-default)
 * para quem lê o HTML sem executar JS. Sem tratamento, a rota teria DOIS títulos/descriptions
 * no <head>, e o primeiro (o da home) venceria. Por isso, enquanto há um <Seo> montado, os
 * padrões saem do <head> e voltam quando o último desmonta — rotas sem <Seo> (área logada)
 * continuam com o título padrão em vez de ficarem sem nenhum.
 *
 * canonical e og:url NÃO estão no index.html: a Vercel serve o mesmo HTML para toda rota, e um
 * canonical "/" no HTML bruto contradiria o canonical que o JS define em /privacidade etc.
 *
 * `noindex` não emite canonical nem og:url: canonical apontando para a página contradiz o noindex.
 */
let montados = 0
let padroesRemovidos = []

const Seo = ({ path = '/', title, description, noindex = false }) => {
  // Contador de módulo: só o primeiro <Seo> remove e só o último devolve, então dois
  // montados ao mesmo tempo não restauram os padrões com o outro ainda na tela.
  useEffect(() => {
    if (montados++ === 0) {
      padroesRemovidos = [...document.head.querySelectorAll('[data-seo-default]')]
      padroesRemovidos.forEach((no) => no.remove())
    }
    return () => {
      if (--montados === 0) {
        padroesRemovidos.forEach((no) => document.head.appendChild(no))
        padroesRemovidos = []
      }
    }
  }, [])

  const url = `${SITE_URL}${path}`

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {noindex ? (
        <meta name="robots" content="noindex" />
      ) : (
        <>
          <link rel="canonical" href={url} />
          <meta property="og:url" content={url} />
        </>
      )}
    </>
  )
}

export default Seo
