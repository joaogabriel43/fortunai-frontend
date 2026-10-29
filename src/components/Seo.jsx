import { useEffect } from 'react'
import { SITE_URL } from '../seo/paginas'

/**
 * Metadados de SEO da rota, com as tags nativas do React 19 (<title>, <meta>, <link>
 * são içadas para o <head> automaticamente — sem react-helmet).
 *
 * O index.html traz um conjunto padrão (marcado com data-seo-default) para quem lê o HTML
 * sem executar JS. Sem tratamento, a rota teria DOIS canonical/og:url/título no <head>, e
 * o primeiro (o da home) venceria. Por isso, enquanto este componente está montado, ele
 * tira os padrões do <head> e os devolve ao desmontar — rotas sem <Seo> (área logada)
 * continuam com o título padrão em vez de ficarem sem nenhum.
 *
 * `noindex` não emite canonical nem og:url: canonical apontando para a página contradiz o noindex.
 */
const Seo = ({ path = '/', title, description, noindex = false }) => {
  useEffect(() => {
    const padroes = [...document.head.querySelectorAll('[data-seo-default]')]
    padroes.forEach((no) => no.remove())
    return () => padroes.forEach((no) => document.head.appendChild(no))
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
