const ANILIST_API = 'https://graphql.anilist.co'
export const JIKAN_API = 'https://api.jikan.moe/v4'

export const FEATURED_MANGA = [
  { title: 'Gachiakuta', search: 'Gachiakuta', author: 'Kei Urana', genre: 'Acción', synopsisEs: 'En una ciudad flotante, un joven es acusado injustamente y arrojado al abismo. Allí, la basura de la humanidad se convierte en monstruos y la supervivencia abre paso a una historia de acción y venganza.' },
  { title: 'Shingeki no Kyojin', subtitle: 'Attack on Titan', search: 'Attack on Titan', author: 'Hajime Isayama', genre: 'Acción', synopsisEs: 'Tras siglos tras enormes murallas, la humanidad enfrenta el regreso de los titanes. Eren y sus amigos se unen al cuerpo de exploración para luchar y descubrir qué se esconde tras los muros.' },
  { title: 'Tower Dungeon', search: 'Tower Dungeon', author: 'Tsutomu Nihei', genre: 'Fantasía', synopsisEs: 'Cuando una princesa desaparece dentro de una torre colosal, el joven granjero Yuva es reclutado para acompañar a la guardia real en una ascensión llena de criaturas y peligros.' },
  { title: 'Dungeon Meshi', subtitle: 'Delicious in Dungeon', search: 'Delicious in Dungeon', author: 'Ryoko Kui', genre: 'Fantasía', synopsisEs: 'Un grupo de aventureros regresa a una mazmorra para rescatar a su compañera. Sin provisiones, decide cocinar las criaturas que encuentra en el camino.' },
  { title: '20th Century Boys', search: '20th Century Boys', author: 'Naoki Urasawa', genre: 'Misterio', synopsisEs: 'Kenji y sus amigos reconocen en una serie de catástrofes las señales de un juego que inventaron de niños. Una conspiración crece alrededor de una figura llamada Amigo.' },
]

const titles = [
  ['One Piece', 'Eiichiro Oda', 'Aventura'], ['Berserk', 'Kentaro Miura', 'Fantasía oscura'],
  ['Blue Lock', 'Muneyuki Kaneshiro', 'Deportes'], ['Chainsaw Man', 'Tatsuki Fujimoto', 'Acción'],
  ['Jujutsu Kaisen', 'Gege Akutami', 'Acción'], ['Frieren: Beyond Journey’s End', 'Kanehito Yamada', 'Fantasía'],
  ['Vagabond', 'Takehiko Inoue', 'Drama'], ['Dandadan', 'Yukinobu Tatsu', 'Sobrenatural'],
  ['Spy x Family', 'Tatsuya Endo', 'Comedia'], ['Akira', 'Katsuhiro Otomo', 'Ciencia ficción'],
  ['Vinland Saga', 'Makoto Yukimura', 'Histórico'], ['Sakamoto Days', 'Yuto Suzuki', 'Acción'],
  ['Naruto', 'Masashi Kishimoto', 'Aventura'], ['Kimetsu no Yaiba', 'Koyoharu Gotouge', 'Fantasía'],
  ['My Hero Academia', 'Kohei Horikoshi', 'Superhéroes'], ['Hunter x Hunter', 'Yoshihiro Togashi', 'Aventura'],
  ['Death Note', 'Tsugumi Ohba', 'Suspenso'], ['Tokyo Ghoul', 'Sui Ishida', 'Fantasía oscura'],
  ['Fullmetal Alchemist', 'Hiromu Arakawa', 'Aventura'], ['Dragon Ball', 'Akira Toriyama', 'Aventura'],
  ['Haikyu!!', 'Haruichi Furudate', 'Deportes'], ['The Promised Neverland', 'Kaiu Shirai', 'Suspenso'],
  ['Kingdom', 'Yasuhisa Hara', 'Histórico'], ['Mob Psycho 100', 'ONE', 'Sobrenatural'],
].map(([title, author, genre], index) => ({
  mal_id: `local-${index}`, id: `local-${index}`, title, title_english: title, authors: [{ name: author }],
  genres: [{ name: genre }], score: null, averageScore: null, popularity: 24 - index, volumes: null, image: '',
  synopsis: 'Título de muestra para explorar el catálogo local. Los datos de venta de esta demostración no son oficiales.',
  price: 129 + (index * 17) % 171, author, genre,
}))

function volumePrice(manga) {
  const number = String(manga.idMal || manga.mal_id || manga.id).match(/\d+/)?.[0]
  return 129 + ((Number(number) || 7) * 17) % 171
}

function plainSynopsis(value = '') {
  return value.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#039;|&apos;/gi, "'").replace(/[ \t]+/g, ' ').replace(/\n\s+/g, '\n').trim()
}

export function normalizeAniList(manga) {
  const title = manga.title?.english || manga.title?.romaji || manga.title?.native || 'Manga sin título'
  const authors = manga.staff?.edges?.filter((edge) => /story|art|author/i.test(edge.role || '')).map((edge) => edge.node.name.full) || []
  const author = [...new Set(authors)].slice(0, 2).join(', ') || 'Autoría por confirmar'
  const id = manga.idMal || `anilist-${manga.id}`
  return {
    ...manga,
    id: manga.id,
    mal_id: String(id),
    idMal: manga.idMal,
    title,
    title_english: title,
    authors: author === 'Autoría por confirmar' ? [] : author.split(', ').map((name) => ({ name })),
    image: manga.coverImage?.extraLarge || manga.coverImage?.large || manga.coverImage?.medium || '',
    author,
    genre: manga.genres?.[0] || 'Manga',
    score: manga.averageScore ? manga.averageScore / 10 : null,
    popularity: manga.popularity || 0,
    synopsis: plainSynopsis(manga.description || '') || 'Sinopsis no disponible.',
    volumes: manga.volumes || null,
    chapters: manga.chapters || null,
    status: manga.status || '',
    year: manga.startDate?.year || null,
    price: volumePrice(manga),
  }
}

export function normalizeJikan(manga) {
  const image = manga.images?.jpg?.large_image_url || manga.images?.jpg?.image_url || ''
  const author = manga.authors?.map((item) => item.name).filter(Boolean).join(', ') || 'Autoría por confirmar'
  const synopsis = plainSynopsis(manga.synopsis || '')
  return { ...manga, synopsis, id: manga.mal_id, mal_id: String(manga.mal_id), image, author, price: volumePrice(manga), genre: manga.genres?.[0]?.name || 'Manga' }
}

export const fallbackTitles = titles

const mediaFields = `
  id idMal title { romaji english native } coverImage { extraLarge large medium color } bannerImage
  description(asHtml: false) genres averageScore popularity volumes chapters status format startDate { year month }
  staff(sort: RELEVANCE, perPage: 5) { edges { role node { name { full } } } }
`

const anilistQuery = `query ($sort: [MediaSort], $page: Int, $perPage: Int, $search: String) {
  Page(page: $page, perPage: $perPage) {
    media(type: MANGA, sort: $sort, search: $search, isAdult: false) {
      ${mediaFields}
    }
  }
}`

const collectionQuery = `query {
  popular: Page(page: 1, perPage: 24) { media(type: MANGA, sort: [POPULARITY_DESC], isAdult: false) { ${mediaFields} } }
  recent: Page(page: 1, perPage: 16) { media(type: MANGA, sort: [START_DATE_DESC], isAdult: false) { ${mediaFields} } }
  recommended: Page(page: 1, perPage: 16) { media(type: MANGA, sort: [SCORE_DESC], isAdult: false) { ${mediaFields} } }
}`

const featuredQuery = `query {
  ${FEATURED_MANGA.map((manga, index) => `m${index}: Media(search: ${JSON.stringify(manga.search)}, type: MANGA, isAdult: false) { ${mediaFields} }`).join('\n  ')}
}`

function makeFeaturedFallback(manga, index) {
  return {
    id: `featured-${index}`, mal_id: `featured-${index}`, title: manga.title, title_english: manga.title,
    subtitle: manga.subtitle || '', image: '', coverImage: {}, bannerImage: '',
    authors: manga.author ? [{ name: manga.author }] : [], genres: manga.genre ? [{ name: manga.genre }] : [], genre: manga.genre || 'Manga', synopsis: manga.synopsisEs || 'Sinopsis no disponible.',
    author: manga.author || 'Autoría por confirmar',
    price: 149 + index * 20, score: null, popularity: 0, volumes: null, chapters: null, status: '', year: null,
  }
}

export async function fetchFeaturedManga(signal) {
  const response = await fetch(ANILIST_API, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query: featuredQuery }), signal: signal || AbortSignal.timeout(10000),
  })
  if (!response.ok) throw new Error(`AniList respondió ${response.status}`)
  const payload = await response.json()
  if (payload.errors?.length) throw new Error(payload.errors[0].message)
  return FEATURED_MANGA.map((manga, index) => {
    const result = payload.data?.[`m${index}`]
    if (!result) return makeFeaturedFallback(manga, index)
    return { ...normalizeAniList(result), title: manga.title, title_english: manga.title, subtitle: manga.subtitle || '', synopsis: manga.synopsisEs, originalTitle: result.title?.romaji || result.title?.native || '' }
  })
}

export async function fetchAniListCollection(signal) {
  const response = await fetch(ANILIST_API, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query: collectionQuery }),
    signal: signal || AbortSignal.timeout(10000),
  })
  if (!response.ok) throw new Error(`AniList respondió ${response.status}`)
  const payload = await response.json()
  if (payload.errors?.length) throw new Error(payload.errors[0].message)
  const data = payload.data
  if (!Array.isArray(data?.popular?.media)) throw new Error('Respuesta de catálogo inesperada')
  return {
    popular: data.popular.media.map(normalizeAniList),
    recent: (data.recent?.media || []).map(normalizeAniList),
    recommended: (data.recommended?.media || []).map(normalizeAniList),
  }
}

export async function fetchAniList({ sort = ['POPULARITY_DESC'], search = '', limit = 24, page = 1, signal } = {}) {
  const response = await fetch(ANILIST_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query: anilistQuery, variables: { sort: search ? ['SEARCH_MATCH'] : sort, page, perPage: limit, ...(search ? { search } : {}) } }),
    signal: signal || AbortSignal.timeout(9000),
  })
  if (!response.ok) throw new Error(`AniList respondió ${response.status}`)
  const payload = await response.json()
  if (payload.errors?.length) throw new Error(payload.errors[0].message)
  const media = payload.data?.Page?.media
  if (!Array.isArray(media)) throw new Error('Respuesta de catálogo inesperada')
  return media.map(normalizeAniList)
}

function titleKey(title) {
  return title.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

const anilistCoverCache = new Map()

export function findAniListCover(title) {
  const key = titleKey(title)
  if (anilistCoverCache.has(key)) return anilistCoverCache.get(key)
  const request = (async () => {
    try {
      const response = await fetch(ANILIST_API, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          query: 'query ($search: String!) { Media(search: $search, type: MANGA) { title { romaji english native } coverImage { extraLarge large medium } } }',
          variables: { search: title },
        }), signal: AbortSignal.timeout(5000),
      })
      if (!response.ok) return ''
      const manga = (await response.json()).data?.Media
      const matches = Object.values(manga?.title || {}).filter(Boolean).map(titleKey)
      return matches.some((candidate) => candidate === key || candidate.startsWith(key))
        ? manga.coverImage?.extraLarge || manga.coverImage?.large || manga.coverImage?.medium || '' : ''
    } catch { return '' }
  })()
  anilistCoverCache.set(key, request)
  return request
}

export async function findBackupCover(title) {
  const aniListCover = await findAniListCover(title)
  if (aniListCover) return aniListCover
  try {
    const response = await fetch(`${JIKAN_API}/manga?q=${encodeURIComponent(title)}&limit=8`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(7000) })
    if (!response.ok) return ''
    const needle = titleKey(title)
    const matches = (await response.json()).data || []
    const exact = matches.find((manga) => [manga.title, manga.title_english, manga.title_japanese, ...(manga.title_synonyms || [])].filter(Boolean).some((candidate) => titleKey(candidate) === needle))
    return exact?.images?.jpg?.large_image_url || exact?.images?.jpg?.image_url || ''
  } catch { return '' }
}
