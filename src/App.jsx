import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion, useSpring } from 'motion/react'
import {
  ArrowDown, ArrowLeft, ArrowRight, BookOpen, CalendarDays, Check, ChevronLeft, ChevronRight, CircleUserRound,
  CreditCard, Heart, Minus, Pause, Play, Plus, Search, ShoppingBag, Sparkles, Star, X,
} from 'lucide-react'
import { FEATURED_MANGA, fallbackTitles, fetchAniList, fetchAniListCollection, fetchFeaturedManga, findAniListCover, findBackupCover, JIKAN_API, normalizeJikan } from './data/catalog.js'
import './App.css'

const CART_KEY = 'mangaintegral-cart-v1'
const USER_KEY = 'mangaintegral-user-v1'
const ORDERS_KEY = 'mangaintegral-orders-v1'
const PROFILES_KEY = 'mangaintegral-profiles-v1'
const ACCOUNTS_KEY = 'mangaintegral-accounts-v1'
const LAST_DETAIL_KEY = 'mangaintegral-last-detail-v1'
const LOCAL_TITLES = fallbackTitles
const PROFILE_AVATARS = [
  { id: 'rudo', name: 'Rudo', image: 'https://gachiakuta-anime.com/assets/img/chara/chara_face/chara_face_1-1.jpg', source: 'Sitio oficial de Gachiakuta' },
  { id: 'senku', name: 'Senku', image: 'https://a.storyblok.com/f/178900/712x1362/b844774350/ds1_senku.png/m/filters:quality(95)format(webp)', source: 'Crunchyroll News' },
  { id: 'kiriko', name: 'Kirito', image: 'https://www.swordart-online.net/sp/aincrad/character/img/chara01.jpg', source: 'Sitio oficial de Sword Art Online' },
  { id: 'naruto', name: 'Naruto', image: 'https://static.zerochan.net/Uzumaki.Naruto.full.3416551.png', source: 'Ilustración oficial de Naruto' },
  { id: 'tanjiro', name: 'Tanjiro', image: 'https://blue.kumparan.com/image/upload/fl_progressive%2Cfl_lossy%2Cc_fill%2Cq_auto%3Abest%2Cw_640/v1635829606/udnaxsgdgtfguyriozdm.jpg', source: 'Artículo de Kumparan' },
  { id: 'luffy', name: 'Luffy', image: 'https://opwiki.org/images/RuffyNew.jpg', source: 'OPwiki' },
]

function safeRead(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback } catch { return fallback }
}

function money(value) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(value)
}

function createOrderTimestamp() {
  return new Date().toISOString()
}

function favoriteKey(manga) {
  return manga.title.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function emailKey(email) { return email.trim().toLowerCase() }

function emailIsValid(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailKey(email)) }

function AvatarPortrait({ avatar, className = '' }) {
  return <img className={className} src={avatar.image} alt={`Avatar de ${avatar.name}`} loading="lazy" decoding="async" referrerPolicy="no-referrer" />
}

function passwordRules(password) {
  return [['Al menos 6 caracteres', password.length >= 6]]
}

async function derivePasswordHash(password, salt) {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 210000, hash: 'SHA-256' }, keyMaterial, 256)
  return [...new Uint8Array(bits)].map((byte) => byte.toString(16).padStart(2, '0')) // taste-skill-ignore: fixed-width PBKDF2 byte encoding.
    .join('')
}

function safeEqual(left, right) {
  if (left.length !== right.length) return false
  let mismatch = 0
  for (let index = 0; index < left.length; index += 1) mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index)
  return mismatch === 0
}

function ProductCover({ manga, className = '' }) {
  const coverKey = `${manga.title}|${manga.image || ''}`
  const [cover, setCover] = useState(() => ({ key: coverKey, url: manga.image, complete: Boolean(manga.image), failed: false }))

  useEffect(() => {
    let active = true
    if (!manga.image) {
      findBackupCover(manga.title).then((url) => {
        if (active) setCover({ key: coverKey, url, complete: true, failed: false })
      })
    }
    return () => { active = false }
  }, [coverKey, manga.image, manga.title])

  const stateMatches = cover.key === coverKey
  const primaryFailed = stateMatches && cover.failed
  const image = stateMatches ? cover.url : manga.image
  const hasFailed = stateMatches && cover.complete && !cover.url

  const loadBackup = () => findBackupCover(manga.title).then((url) => setCover({ key: coverKey, url, complete: true, failed: true }))
  const loadAniListBackup = () => findAniListCover(manga.title).then((url) => setCover({ key: coverKey, url, complete: true, failed: true }))

  return (
    <div className={`product-cover ${className}`}>
      {image ? <img src={image} alt={`Portada de ${manga.title}`} loading="lazy" decoding="async" onError={() => {
        if (image === manga.image && !primaryFailed) {
          loadBackup()
        } else if (image.includes('covers.openlibrary.org')) loadAniListBackup()
        else setCover({ key: coverKey, url: '', complete: true, failed: true })
      }} onLoad={(event) => {
        const { naturalWidth, naturalHeight } = event.currentTarget
        if (naturalWidth < 80 || naturalHeight / naturalWidth < 1.1) {
          if (image === manga.image && !primaryFailed) loadBackup()
          else if (image.includes('covers.openlibrary.org')) loadAniListBackup()
          else setCover({ key: coverKey, url: '', complete: true, failed: true })
        }
      }} /> : (
        <div className={`cover-placeholder cover-tone-${Math.abs(String(manga.mal_id).length + manga.title.length) % 5}`} data-unavailable={hasFailed || undefined}>
          <span>MANGA<br />INTEGRAL</span><b>{manga.title}</b><i>{manga.author}</i>
        </div>
      )}
      <span className="cover-spine" />
    </div>
  )
}

function MangaRail({ id, title, note, items, onAdd, onSelect, onLike, isFavorite, reduceMotion }) {
  const railRef = useRef(null)
  const dragRef = useRef(null)
  const suppressClickRef = useRef(false)
  const [railPage, setRailPage] = useState(0)
  const [railPages, setRailPages] = useState(1)
  const [inView, setInView] = useState(false)
  const [autoPlay, setAutoPlay] = useState(true)
  const [interacting, setInteracting] = useState(false)
  const moveRail = useCallback((direction) => {
    const rail = railRef.current
    if (!rail) return
    const step = rail.clientWidth * 0.78
    const next = rail.scrollLeft + direction * step
    rail.scrollTo({ left: direction > 0 && next >= rail.scrollWidth - rail.clientWidth - 8 ? 0 : Math.max(0, next), behavior: reduceMotion ? 'instant' : 'smooth' })
  }, [reduceMotion])
  const updateRailPage = () => {
    const rail = railRef.current
    if (!rail) return
    const step = Math.max(1, rail.clientWidth * 0.78)
    setRailPages(Math.max(1, Math.ceil((rail.scrollWidth - rail.clientWidth) / step) + 1))
    setRailPage(Math.max(0, Math.round(rail.scrollLeft / step)))
  }

  useEffect(() => {
    const rail = railRef.current
    if (!rail || !('IntersectionObserver' in window)) return undefined
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin: '120px' })
    observer.observe(rail)
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    if (!inView || !autoPlay || interacting || reduceMotion) return undefined
    const timer = window.setInterval(() => moveRail(1), 5600)
    return () => window.clearInterval(timer)
  }, [inView, autoPlay, interacting, reduceMotion, railPages, moveRail])
  useEffect(() => {
    updateRailPage()
    window.addEventListener('resize', updateRailPage)
    return () => window.removeEventListener('resize', updateRailPage)
  }, [items.length])
  const beginDrag = (event) => {
    if (event.pointerType !== 'mouse' || event.button !== 0 || (event.target.closest('button') && !event.target.closest('.tile-cover-open'))) return
    dragRef.current = { x: event.clientX, left: railRef.current.scrollLeft, moved: false }
  }
  const drag = (event) => {
    const gesture = dragRef.current
    if (!gesture) return
    const distance = event.clientX - gesture.x
    if (Math.abs(distance) > 5) {
      gesture.moved = true
      railRef.current.scrollLeft = gesture.left - distance
      suppressClickRef.current = true
    }
  }
  const endDrag = () => { dragRef.current = null; window.setTimeout(() => { suppressClickRef.current = false }, 0) }

  return (
    <section className="manga-rail-section" id={id} aria-label={title}>
      <div className="rail-heading">
        <div><span className="rail-note"><Sparkles size={14} />{note}</span><h2>{title}</h2><span className="rail-hint">Arrastra o desliza para explorar · {railPage + 1} / {railPages}</span></div>
        <div className="rail-controls"><motion.button whileTap={{ scale: .92 }} aria-label={`Anterior: ${title}`} onClick={() => moveRail(-1)}><ChevronLeft size={18} /></motion.button><motion.button whileTap={{ scale: .92 }} aria-label={`Siguiente: ${title}`} onClick={() => moveRail(1)}><ChevronRight size={18} /></motion.button><motion.button whileTap={{ scale: .92 }} aria-label={reduceMotion ? `Reproducción automática desactivada por preferencia del sistema: ${title}` : autoPlay ? `Pausar carrusel: ${title}` : `Reanudar carrusel: ${title}`} aria-pressed={autoPlay && !reduceMotion} disabled={reduceMotion} onClick={() => setAutoPlay((value) => !value)}>{!autoPlay || reduceMotion ? <Play size={15} /> : <Pause size={15} />}</motion.button></div>
      </div>
      <div className="manga-rail" ref={railRef} tabIndex={0} aria-label={`Carrusel de ${title}`} onScroll={updateRailPage} onPointerDown={beginDrag} onPointerMove={drag} onPointerUp={endDrag} onPointerCancel={endDrag} onMouseEnter={() => setInteracting(true)} onMouseLeave={() => setInteracting(false)} onFocus={() => setInteracting(true)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setInteracting(false) }} onClickCapture={(event) => { if (suppressClickRef.current) { event.preventDefault(); event.stopPropagation() } }}>
        {items.map((manga, index) => <motion.article className="manga-tile" key={`${id}-${manga.mal_id}`} initial={reduceMotion ? false : { opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.16 }} transition={{ duration: reduceMotion ? 0 : 0.34, delay: reduceMotion ? 0 : Math.min(index, 5) * 0.045, ease: [0.23, 1, 0.32, 1] }}>
          <div className="tile-art">
            <button className="tile-cover-open" onClick={() => onSelect(manga)} aria-label={`Ver detalles de ${manga.title}`}><ProductCover manga={manga} className="tile-cover" /></button>
            <motion.button className={`tile-like ${isFavorite(manga) ? 'is-favorite' : ''}`} whileTap={{ scale: .82 }} onClick={() => onLike(manga)} aria-label={`${isFavorite(manga) ? 'Quitar de' : 'Añadir a'} favoritos: ${manga.title}`} aria-pressed={isFavorite(manga)}><Heart size={17} fill={isFavorite(manga) ? 'currentColor' : 'none'} /></motion.button>
            <motion.button className="tile-add" whileTap={{ scale: .94 }} onClick={(event) => onAdd(manga, event)} aria-label={`Añadir ${manga.title} al carrito`}><Plus size={16} /> Añadir</motion.button>
          </div>
          <button className="tile-copy" onClick={() => onSelect(manga)}><strong>{manga.title}</strong><span>{manga.author}</span><b>{money(manga.price)} <small>MXN</small></b></button>
        </motion.article>)}
      </div>
      <div className="rail-pagination" aria-label={`Posición del carrusel ${title}`}>
        {Array.from({ length: railPages }, (_, index) => <button key={index} className={index === railPage ? 'is-current' : ''} aria-label={`Mostrar grupo ${index + 1} de ${title}`} aria-current={index === railPage ? 'true' : undefined} onClick={() => railRef.current?.scrollTo({ left: index * railRef.current.clientWidth * 0.78, behavior: reduceMotion ? 'instant' : 'smooth' })} />)}
      </div>
    </section>
  )
}

function App() {
  const [catalog, setCatalog] = useState(LOCAL_TITLES)
  const [popular, setPopular] = useState(LOCAL_TITLES.slice(0, 12))
  const [newReleases, setNewReleases] = useState(LOCAL_TITLES.slice(2, 14))
  const [recommended, setRecommended] = useState(LOCAL_TITLES.slice(4, 16))
  const [catalogPage, setCatalogPage] = useState(1)
  const [canLoadMore, setCanLoadMore] = useState(true)
  const [apiState, setApiState] = useState('loading')
  const [query, setQuery] = useState('')
  const [cart, setCart] = useState(() => safeRead(CART_KEY, []))
  const [user, setUser] = useState(() => safeRead(USER_KEY, ''))
  const [profiles, setProfiles] = useState(() => safeRead(PROFILES_KEY, {}))
  const [accounts, setAccounts] = useState(() => safeRead(ACCOUNTS_KEY, {}))
  const [orders, setOrders] = useState(() => safeRead(ORDERS_KEY, []))
  const [notice, setNotice] = useState('')
  const [activePanel, setActivePanel] = useState('')
  const [selectedManga, setSelectedManga] = useState(() => window.location.hash.startsWith('#/manga/') ? safeRead(LAST_DETAIL_KEY, null) : null)
  const [page, setPage] = useState(() => {
    const hash = window.location.hash
    const route = ['#/login', '#/register', '#/profile'].includes(hash) ? hash.slice(2) : hash.startsWith('#/manga/') ? 'details' : 'home'
    return route === 'profile' && !safeRead(USER_KEY, '') ? 'login' : route
  })
  const [featured, setFeatured] = useState(FEATURED_MANGA.map((manga, index) => ({ ...manga, id: `featured-${index}`, mal_id: `featured-${index}`, author: manga.author || 'Cargando ficha…', image: '', price: 149 + index * 20, genres: manga.genre ? [{ name: manga.genre }] : [], synopsis: manga.synopsisEs || '' })))
  const [loginInvite, setLoginInvite] = useState(false)
  const [flight, setFlight] = useState(null)
  const [slide, setSlide] = useState(0)
  const [slideDirection, setSlideDirection] = useState(1)
  const [checkoutDone, setCheckoutDone] = useState(false)
  const [email, setEmail] = useState('')
  const [authMode, setAuthMode] = useState('login')
  const [authName, setAuthName] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authConfirm, setAuthConfirm] = useState('')
  const [authError, setAuthError] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [profileName, setProfileName] = useState(() => {
    const savedUser = safeRead(USER_KEY, '')
    const savedProfiles = safeRead(PROFILES_KEY, {})
    return savedProfiles[savedUser]?.name || savedUser.split('@')[0]
  })
  const [profileEditor, setProfileEditor] = useState('')
  const [heroInteracting, setHeroInteracting] = useState(false)
  const heroDrag = useRef(null)
  const stageX = useSpring(0, { stiffness: 140, damping: 22 })
  const stageY = useSpring(0, { stiffness: 140, damping: 22 })
  const backdropX = useSpring(0, { stiffness: 90, damping: 24 })
  const backdropY = useSpring(0, { stiffness: 90, damping: 24 })
  const catalogController = useRef(null)
  const cartButtonRef = useRef(null)
  const reduceMotion = useReducedMotion()

  const navigate = useCallback((destination, manga = null, push = true) => {
    if (manga) {
      setSelectedManga(manga)
      try { localStorage.setItem(LAST_DETAIL_KEY, JSON.stringify(manga)) } catch { /* Details remain available for this view. */ }
    }
    if (destination !== 'details') setSelectedManga(null)
    setPage(destination)
    setActivePanel('')
    if (push) {
      const hash = destination === 'home' ? '#inicio' : destination === 'details' ? `#/manga/${manga?.mal_id || ''}` : `#/${destination}`
      window.history.pushState({ page: destination }, '', hash)
    }
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'instant' : 'smooth' })
  }, [reduceMotion])

  const changeSlide = useCallback((direction, index = null) => {
    const target = index === null ? (slide + direction + featured.length) % featured.length : (index + featured.length) % featured.length
    const forward = (target - slide + featured.length) % featured.length
    const shortest = forward > featured.length / 2 ? forward - featured.length : forward
    setSlideDirection(shortest < 0 ? -1 : 1)
    setSlide(target)
  }, [featured.length, slide])

  const loadCatalog = useCallback(async (term = '') => {
    setCatalogPage(1)
    setCanLoadMore(true)
    catalogController.current?.abort()
    const controller = new AbortController()
    catalogController.current = controller
    try {
      if (term) {
        const items = await fetchAniList({ search: term, limit: 24, signal: AbortSignal.any([controller.signal, AbortSignal.timeout(9000)]) })
        setCatalog(items)
        setCanLoadMore(items.length === 24)
      } else {
        const sections = await fetchAniListCollection(AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]))
        if (controller.signal.aborted) return
        setCatalog(sections.popular)
        setCanLoadMore(sections.popular.length === 24)
        setPopular(sections.popular)
        setNewReleases(sections.recent)
        setRecommended(sections.recommended)
      }
      setApiState('live')
    } catch {
      if (controller.signal.aborted) return
      try {
        const url = term
          ? `${JIKAN_API}/manga?q=${encodeURIComponent(term)}&limit=24&order_by=score&sort=desc`
          : `${JIKAN_API}/top/manga?filter=bypopularity&limit=24`
        const response = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.any([controller.signal, AbortSignal.timeout(7000)]) })
        if (!response.ok) throw new Error(`Jikan respondió ${response.status}`)
        const payload = await response.json()
        if (!Array.isArray(payload.data)) throw new Error('Respuesta de catálogo inesperada')
        const items = payload.data.map(normalizeJikan)
        setCatalog(items)
        setCanLoadMore(items.length === 24)
        if (!term) {
          setPopular(items.slice(0, 16))
          setNewReleases([...items].sort((a, b) => (b.published?.from || '').localeCompare(a.published?.from || '')).slice(0, 16))
          setRecommended([...items].sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 16))
        }
        setApiState('jikan')
      } catch {
        if (controller.signal.aborted) return
        const needle = term.toLocaleLowerCase()
        const localCatalog = term ? LOCAL_TITLES.filter((manga) => `${manga.title} ${manga.author} ${manga.genre}`.toLocaleLowerCase().includes(needle)) : LOCAL_TITLES
        setCatalog(localCatalog)
        setCanLoadMore(false)
        if (!term) {
          setPopular(LOCAL_TITLES.slice(0, 16))
          setNewReleases(LOCAL_TITLES.slice(8, 24))
          setRecommended(LOCAL_TITLES.slice(4, 20))
        }
        setApiState('offline')
      }
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => loadCatalog(), 0)
    return () => window.clearTimeout(timer)
  }, [loadCatalog])
  useEffect(() => {
    const controller = new AbortController()
    fetchFeaturedManga(controller.signal).then((items) => setFeatured(items)).catch(() => {
      setFeatured(FEATURED_MANGA.map((manga, index) => ({ ...manga, id: `featured-${index}`, mal_id: `featured-${index}`, author: manga.author || 'Autoría por confirmar', image: '', price: 149 + index * 20, genres: manga.genre ? [{ name: manga.genre }] : [], synopsis: manga.synopsisEs || '' })))
    })
    return () => controller.abort()
  }, [])
  useEffect(() => {
    const syncRoute = () => {
      const hash = window.location.hash
      const route = hash.startsWith('#/manga/') ? 'details' : hash === '#/login' ? 'login' : hash === '#/register' ? 'register' : hash === '#/profile' ? 'profile' : 'home'
      const next = route === 'profile' && !safeRead(USER_KEY, '') ? 'login' : route
      setPage(next)
      setActivePanel('')
      if (next === 'details') setSelectedManga((current) => current || safeRead(LAST_DETAIL_KEY, null))
      if (next === 'home') setSelectedManga(null)
    }
    window.addEventListener('popstate', syncRoute)
    window.addEventListener('hashchange', syncRoute)
    return () => { window.removeEventListener('popstate', syncRoute); window.removeEventListener('hashchange', syncRoute) }
  }, [])
  useEffect(() => { localStorage.setItem(CART_KEY, JSON.stringify(cart)) }, [cart])
  useEffect(() => { localStorage.setItem(USER_KEY, JSON.stringify(user)) }, [user])
  useEffect(() => { localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles)) }, [profiles])
  useEffect(() => { localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts)) }, [accounts])
  useEffect(() => { localStorage.setItem(ORDERS_KEY, JSON.stringify(orders)) }, [orders])
  useEffect(() => {
    if (!query.trim()) return
    const timer = window.setTimeout(() => loadCatalog(query.trim()), 450)
    return () => window.clearTimeout(timer)
  }, [query, loadCatalog])
  useEffect(() => {
    if (featured.length < 2 || page !== 'home' || activePanel || heroInteracting) return
    if (reduceMotion) return
    const timer = window.setInterval(() => changeSlide(1), 6200)
    return () => window.clearInterval(timer)
  }, [featured.length, activePanel, page, heroInteracting, reduceMotion, changeSlide])
  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => { setNotice(''); setLoginInvite(false) }, 3200)
    return () => window.clearTimeout(timer)
  }, [notice])
  useEffect(() => {
    const closeOnEscape = (event) => { if (event.key === 'Escape') { setActivePanel(''); if (page !== 'home') navigate('home') } }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [page, navigate])
  useEffect(() => {
    if (!activePanel) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [activePanel])

  const current = featured[slide % (featured.length || 1)] || featured[0]
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const visibleCatalog = catalog

  const addNow = (manga) => {
    setCart((items) => {
      const id = String(manga.mal_id)
      const exists = items.some((item) => item.id === id)
      return exists
        ? items.map((item) => item.id === id ? { ...item, quantity: item.quantity + 1 } : item)
        : [...items, { ...manga, id, title: manga.title, image: manga.image, author: manga.author, price: manga.price, quantity: 1 }]
    })
    setNotice(`${manga.title} añadido al carrito`)
  }

  const addToCart = (manga, event) => {
    const image = event?.currentTarget?.closest('.manga-tile')?.querySelector('.product-cover img')
      || document.querySelector('.featured-cover .product-cover img')
    const from = image?.getBoundingClientRect()
    const to = cartButtonRef.current?.getBoundingClientRect()
    if (!reduceMotion && image?.currentSrc && from?.width && to?.width) {
      setFlight({ id: `${manga.mal_id}-${Date.now()}`, manga, src: image.currentSrc, from: { left: from.left, top: from.top, width: from.width, height: from.height }, to: { x: to.left + to.width / 2 - from.left - from.width / 2, y: to.top + to.height / 2 - from.top - from.height / 2 } })
      return
    }
    addNow(manga)
  }

  const favoriteIds = user ? (profiles[user]?.favorites || []) : []
  const isFavorite = (manga) => favoriteIds.some((saved) => typeof saved === 'string'
    ? saved === favoriteKey(manga) || saved === String(manga.mal_id)
    : saved.key === favoriteKey(manga))
  const requestLike = (manga) => {
    if (!user) {
      setLoginInvite(true)
      setNotice('Inicia sesión para guardar mangas en tus favoritos')
      return
    }
    setLoginInvite(false)
    const id = favoriteKey(manga)
    setProfiles((currentProfiles) => {
      const saved = currentProfiles[user] || { email: user, favorites: [] }
      const wasFavorite = saved.favorites.some((item) => typeof item === 'string' ? item === id || item === String(manga.mal_id) : item.key === id)
      const favorites = wasFavorite
        ? saved.favorites.filter((item) => typeof item === 'string' ? item !== id && item !== String(manga.mal_id) : item.key !== id)
        : [...saved.favorites, { key: id, manga: { ...manga, mal_id: String(manga.mal_id) } }]
      return { ...currentProfiles, [user]: { ...saved, email: user, favorites } }
    })
    setNotice(isFavorite(manga) ? 'Manga quitado de favoritos' : 'Manga guardado en favoritos')
  }

  const allMangas = [...catalog, ...popular, ...newReleases, ...recommended]
  const mangaById = new Map(allMangas.map((manga) => [String(manga.mal_id), manga]))
  const mangaByFavoriteKey = new Map(allMangas.map((manga) => [favoriteKey(manga), manga]))
  const favoriteMangas = favoriteIds.map((saved) => typeof saved === 'string'
    ? mangaByFavoriteKey.get(saved) || mangaById.get(saved)
    : mangaByFavoriteKey.get(saved.key) || saved.manga).filter(Boolean)
  const userOrders = orders.filter((order) => order.email?.toLowerCase() === user.toLowerCase())
  const saveProfile = (event) => {
    event.preventDefault()
    const name = profileName.trim()
    if (name.length < 2 || name.length > 60) { setNotice('El nombre debe tener entre 2 y 60 caracteres'); return }
    const previous = profiles[user] || { email: user, favorites: [] }
    setProfiles((current) => ({ ...current, [user]: { ...previous, name } }))
    setAccounts((current) => current[user] ? { ...current, [user]: { ...current[user], name } } : current)
    setProfileEditor('')
    setNotice('Perfil actualizado')
  }
  const setProfileAvatar = (avatarId) => {
    const previous = profiles[user] || { email: user, favorites: [] }
    setProfiles((current) => ({ ...current, [user]: { ...previous, avatarId } }))
    setProfileEditor('')
    setNotice('Avatar actualizado')
  }
  const openManga = (manga) => navigate('details', manga)
  const buyNow = (manga) => {
    setCart([{ ...manga, id: String(manga.mal_id), quantity: 1 }])
    setCheckoutDone(false)
    navigate('home')
    setActivePanel('checkout')
  }

  const updateQuantity = (id, change) => setCart((items) => items
    .map((item) => item.id === id ? { ...item, quantity: item.quantity + change } : item)
    .filter((item) => item.quantity > 0))

  const loadMore = async () => {
    const page = catalogPage + 1
    try {
      let items
      if (apiState === 'live') {
        items = await fetchAniList({ search: query.trim(), page, limit: 24 })
      } else if (apiState === 'jikan') {
        const params = new URLSearchParams({ page: String(page), limit: '24', q: query.trim(), order_by: query.trim() ? 'score' : 'popularity', sort: 'desc' })
        const url = query.trim() ? `${JIKAN_API}/manga?${params}` : `${JIKAN_API}/top/manga?filter=bypopularity&page=${page}&limit=24`
        const response = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(7000) })
        if (!response.ok) throw new Error('No se pudo cargar la página siguiente')
        items = (await response.json()).data.map(normalizeJikan)
      }
      if (!items) return
      const existing = new Set(catalog.map((item) => String(item.mal_id)))
      const uniqueItems = items.filter((item) => !existing.has(String(item.mal_id)))
      setCatalog((currentItems) => [...currentItems, ...uniqueItems])
      setCatalogPage(page)
      setCanLoadMore(items.length === 24 && uniqueItems.length > 0)
    } catch {
      setCanLoadMore(false)
      setNotice('No se pudieron cargar más títulos ahora')
    }
  }

  const signIn = async (event) => {
    event.preventDefault()
    setAuthError('')
    const address = emailKey(email)
    if (!emailIsValid(address)) { setAuthError('Escribe un correo válido.'); return }
    setAuthBusy(true)
    try {
      if (authMode === 'register') {
        const name = authName.trim()
        const rules = passwordRules(authPassword)
        if (name.length < 2 || name.length > 60) { setAuthError('El nombre debe tener entre 2 y 60 caracteres.'); setAuthBusy(false); return }
        if (rules.some(([, valid]) => !valid)) { setAuthError('La contraseña debe tener al menos 6 caracteres.'); setAuthBusy(false); return }
        if (authPassword !== authConfirm) { setAuthError('Las contraseñas no coinciden.'); setAuthBusy(false); return }
        if (accounts[address]) { setAuthError('Ya existe una cuenta local con ese correo. Inicia sesión.'); setAuthBusy(false); return }
        const salt = crypto.getRandomValues(new Uint8Array(16))
        const saltHex = [...salt].map((byte) => byte.toString(16).padStart(2, '0')) // taste-skill-ignore: fixed-width salt encoding.
          .join('')
        const passwordHash = await derivePasswordHash(authPassword, salt)
        setAccounts((currentAccounts) => ({ ...currentAccounts, [address]: { email: address, name, salt: saltHex, passwordHash, createdAt: new Date().toISOString() } }))
        setProfiles((currentProfiles) => ({ ...currentProfiles, [address]: { ...(currentProfiles[address] || {}), email: address, name, favorites: currentProfiles[address]?.favorites || [] } }))
        setUser(address)
      } else {
        const account = accounts[address]
        if (!account) { setAuthError('No encontramos esa cuenta. Crea una cuenta para empezar.'); setAuthBusy(false); return }
        const salt = Uint8Array.from(account.salt.match(/.{2}/g).map((part) => Number.parseInt(part, 16)))
        const passwordHash = await derivePasswordHash(authPassword, salt)
        if (!safeEqual(passwordHash, account.passwordHash)) { setAuthError('El correo o la contraseña no coinciden.'); setAuthBusy(false); return }
        setUser(address)
      }
      setActivePanel('')
      setAuthPassword('')
      setAuthConfirm('')
      setProfileName(profiles[address]?.name || (authMode === 'register' ? authName.trim() : address.split('@')[0]))
      navigate('home')
      setNotice(authMode === 'register' ? 'Cuenta local creada' : 'Sesión local iniciada')
    } catch {
      setAuthError('No se pudo guardar la cuenta en este navegador. Inténtalo de nuevo.')
    } finally {
      setAuthBusy(false)
    }
  }

  const submitOrder = (event) => {
    event.preventDefault()
    const orderEmail = new FormData(event.currentTarget).get('email')?.toString().trim().toLowerCase() || user.toLowerCase()
    const purchasedAt = createOrderTimestamp()
    setOrders((currentOrders) => [...currentOrders, { id: `MI-${Date.now().toString(36).toUpperCase()}`, email: orderEmail, purchasedAt, total: cartTotal, items: cart.map(({ id, title, image, author, price, quantity }) => ({ id, title, image, author, price, quantity })) }])
    setCheckoutDone(true)
    setCart([])
  }

  return (
    <main className="site-shell">
      <header className="topbar">
        <a className="wordmark" href="#inicio" onClick={(event) => { if (page !== 'home') { event.preventDefault(); navigate('home') } }} aria-label="Manga Integral, inicio"><span className="mark-icon">M<span>·</span></span><span>MANGA<br /><b>INTEGRAL</b></span></a>
        <nav className="main-nav" aria-label="Navegación principal" style={page === 'home' ? undefined : { visibility: 'hidden' }}>
          <a href="#populares">Populares</a><a href="#novedades">Novedades</a><a href="#recomendados">Para ti</a><a href="#catalogo">Catálogo</a>
        </nav>
        <div className="nav-actions">
          <motion.button className="icon-link account-trigger" whileTap={{ scale: .94 }} onClick={() => { setAuthError(''); if (user) navigate('profile'); else { setAuthMode('login'); navigate('login') } }} aria-label={user ? `Perfil de ${user}` : 'Iniciar sesión'}>{user ? <AvatarPortrait className="header-avatar" avatar={PROFILE_AVATARS.find((avatar) => avatar.id === profiles[user]?.avatarId) || PROFILE_AVATARS[0]} /> : <CircleUserRound size={18} />}<span>{user ? (profiles[user]?.name || user.split('@')[0]) : 'Cuenta'}</span></motion.button>
          <motion.button ref={cartButtonRef} className="bag-trigger" whileTap={{ scale: .94 }} onClick={() => setActivePanel('cart')} aria-label={`Abrir carrito, ${itemCount} artículos`}><ShoppingBag size={17} /><span>Bolsa</span><motion.b key={itemCount} initial={{ scale: .7, opacity: .6 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 460, damping: 24 }}>{itemCount}</motion.b></motion.button>
        </div>
      </header>

      <AnimatePresence mode="wait" initial={false}>
      {page === 'home' && <motion.div className="page-transition" key="home" initial={reduceMotion ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }} transition={{ duration: reduceMotion ? 0 : .32, ease: [0.16, 1, .3, 1] }}>
      <section className="hero" id="inicio" aria-label="Selección de mangas">
        <section className="cover-theatre" id="seleccion" aria-roledescription="carrusel" aria-label="Mangas destacados" tabIndex={0}
          style={{ '--scene-accent': /^#[\da-f]{6}$/i.test(current?.coverImage?.color || '') ? current.coverImage.color : '#4388f3' }}
          onMouseEnter={() => setHeroInteracting(true)} onMouseLeave={() => { setHeroInteracting(false); stageX.set(0); stageY.set(0); backdropX.set(0); backdropY.set(0) }} onFocus={() => setHeroInteracting(true)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setHeroInteracting(false) }}
          onPointerDown={(event) => { if (event.pointerType === 'touch' || event.pointerType === 'mouse') heroDrag.current = { x: event.clientX, y: event.clientY } }}
          onPointerUp={(event) => { const start = heroDrag.current; heroDrag.current = null; if (!start) return; const dx = event.clientX - start.x; const dy = event.clientY - start.y; if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) changeSlide(dx < 0 ? 1 : -1) }}
          onPointerMove={(event) => { if (reduceMotion || event.pointerType !== 'mouse' || !event.currentTarget.matches(':hover')) return; const bounds = event.currentTarget.getBoundingClientRect(); const x = (event.clientX - bounds.left) / bounds.width - .5; const y = (event.clientY - bounds.top) / bounds.height - .5; stageX.set(x * 5); stageY.set(y * -4); backdropX.set(x * -12); backdropY.set(y * -8) }}
          onKeyDown={(event) => { if (event.key === 'ArrowRight') { event.preventDefault(); changeSlide(1) } else if (event.key === 'ArrowLeft') { event.preventDefault(); changeSlide(-1) } }}>
          <AnimatePresence initial={false}>
            <motion.div key={`theatre-backdrop-${current?.mal_id}`} className="theatre-backdrop" aria-hidden="true" style={{ x: backdropX, y: backdropY, backgroundImage: `url("${current?.bannerImage || current?.image || ''}")` }} initial={{ opacity: 0, scale: 1.08 }} animate={{ opacity: .22, scale: 1.02 }} exit={{ opacity: 0 }} transition={{ duration: reduceMotion ? .12 : .72, ease: [0.16, 1, .3, 1] }} />
          </AnimatePresence>
          <div className="theatre-heading"><span>Historias para llevar contigo</span><a href="#catalogo">Explorar colección <ArrowDown size={15} /></a></div>
          <motion.div className="cover-deck" role="group" aria-label="Portadas destacadas" style={{ rotateX: stageY, rotateY: stageX, transformPerspective: 1100 }}>
            {featured.map((manga, index) => {
              const rawOffset = index - slide
              const offset = rawOffset > featured.length / 2 ? rawOffset - featured.length : rawOffset < -featured.length / 2 ? rawOffset + featured.length : rawOffset
              const distance = Math.abs(offset)
              return <motion.button key={manga.mal_id} type="button" className={`deck-volume ${offset === 0 ? 'is-active' : ''}`} aria-label={offset === 0 ? `Ver detalles de ${manga.title}` : `Mostrar ${manga.title}`} aria-current={offset === 0 ? 'true' : undefined} onClick={() => offset === 0 ? openManga(manga) : changeSlide(offset > 0 ? 1 : -1, index)}
                initial={false} animate={{ x: offset * 180, y: distance === 0 ? -3 : distance * 15, scale: distance === 0 ? 1 : distance === 1 ? .77 : .58, rotateY: offset * -23, rotateZ: offset * -1.1, opacity: distance === 0 ? 1 : distance === 1 ? .8 : .36, filter: distance > 1 ? 'blur(1.3px)' : 'blur(0px)' }}
                transition={reduceMotion ? { duration: .12 } : { type: 'spring', stiffness: 150, damping: 24, mass: .8 }} style={{ zIndex: featured.length - distance }}>
                <ProductCover manga={manga} className="deck-cover" />
                {offset === 0 && <span className="deck-shine" aria-hidden="true" />}
              </motion.button>
            })}
          </motion.div>
          <div className="theatre-floor" aria-hidden="true" />
          <div className="theatre-caption">
            <AnimatePresence mode="wait" initial={false} custom={slideDirection}>
              <motion.div className="theatre-current-copy" key={current?.mal_id} custom={slideDirection} initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: slideDirection * 34, y: 7, filter: 'blur(5px)' }} animate={{ opacity: 1, x: 0, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, x: slideDirection * -24, y: -5, filter: 'blur(3px)' }} transition={{ duration: reduceMotion ? .12 : .38, ease: [0.16, 1, .3, 1] }}>
                <h1>{current?.title}</h1><p>{current?.subtitle || current?.author || 'Una historia que merece su lugar en tu estantería.'}</p>
              </motion.div>
            </AnimatePresence>
            <div className="theatre-description-slot">
              <AnimatePresence mode="wait" initial={false}>
                <motion.p className="theatre-description" key={`description-${current?.mal_id}`} initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: reduceMotion ? .12 : .24, ease: [0.16, 1, .3, 1] }}>{current?.synopsis || 'Una nueva historia te espera. Abre su ficha para descubrir más.'}</motion.p>
              </AnimatePresence>
            </div>
            <motion.div className="theatre-actions" initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduceMotion ? 0 : .32, delay: reduceMotion ? 0 : .08, ease: [0.16, 1, .3, 1] }}><motion.button className="button-primary" whileHover={reduceMotion ? undefined : { y: -2 }} whileTap={{ scale: .97 }} onClick={() => openManga(current)}>Descubrir manga <ArrowRight size={16} /></motion.button><motion.button className="theatre-cart-button" whileHover={reduceMotion ? undefined : { x: 3 }} whileTap={{ scale: .97 }} onClick={(event) => addToCart(current, event)}>Añadir a la bolsa <Plus size={15} /></motion.button></motion.div>
          </div>
          <div className="theatre-controls"><motion.button className="theatre-control" whileHover={reduceMotion ? undefined : { x: -2 }} whileTap={{ scale: .92 }} onClick={() => changeSlide(-1)} aria-label="Manga anterior"><ArrowLeft size={18} /></motion.button><motion.button className="theatre-control" whileHover={reduceMotion ? undefined : { x: 2 }} whileTap={{ scale: .92 }} onClick={() => changeSlide(1)} aria-label="Siguiente manga"><ArrowRight size={18} /></motion.button></div>
          <div className="theatre-pagination" aria-label="Elegir manga destacado">{featured.map((manga, index) => <button key={manga.mal_id} className={slide === index ? 'is-current' : ''} aria-label={`Mostrar ${manga.title}`} aria-current={slide === index ? 'true' : undefined} onClick={() => changeSlide(index > slide ? 1 : -1, index)}><span>{manga.title}</span></button>)}</div>
          <span className="theatre-hint">Arrastra las portadas o desliza para cambiar la selección</span>
        </section>
      </section>

      <div className="discovery-sections">
        <MangaRail id="populares" title="Los más buscados" note="POPULAR AHORA" items={popular} onAdd={addToCart} onSelect={openManga} onLike={requestLike} isFavorite={isFavorite} reduceMotion={reduceMotion} />
        <MangaRail id="novedades" title="Recién llegados" note="NUEVAS HISTORIAS" items={newReleases} onAdd={addToCart} onSelect={openManga} onLike={requestLike} isFavorite={isFavorite} reduceMotion={reduceMotion} />
        <MangaRail id="recomendados" title="Para tu próxima lectura" note="SELECCIÓN INTEGRAL" items={recommended} onAdd={addToCart} onSelect={openManga} onLike={requestLike} isFavorite={isFavorite} reduceMotion={reduceMotion} />
      </div>

      <section className="catalog-section" id="catalogo">
        <div className="section-heading">
          <div><h2>Abre una nueva historia</h2></div>
          <p>Explora portadas, descubre autores y reúne tus próximas lecturas.</p>
        </div>
        <div className="catalog-tools">
          <label className="search-field"><Search size={16} /><input value={query} onChange={(event) => { const value = event.target.value; setQuery(value); setApiState('loading'); if (!value.trim()) loadCatalog() }} placeholder="Buscar manga o autor" aria-label="Buscar manga o autor" /><kbd>↵</kbd></label>
          <div className="source-status"><span className={apiState === 'live' || apiState === 'jikan' ? 'live-dot' : ''} />{apiState === 'loading' ? 'CARGANDO MANGAS' : apiState === 'live' ? 'CATÁLOGO ANILIST' : apiState === 'jikan' ? 'CATÁLOGO JIKAN' : 'MODO MUESTRA'}<button onClick={() => { setApiState('loading'); loadCatalog(query.trim()) }} aria-label="Actualizar catálogo"><ArrowRight size={14} /></button></div>
        </div>
        {apiState === 'offline' && <div className="api-note">No hay conexión con el catálogo ahora. Se muestran títulos de ejemplo; precios y compra son de demostración.</div>}
        {query.trim() && apiState === 'offline' && <div className="api-note">Búsqueda aplicada al catálogo local de muestra.</div>}
        <motion.div className="manga-grid" aria-live="polite" layout>
          {visibleCatalog.length ? visibleCatalog.map((manga, index) => (
            <motion.article className="manga-tile" key={manga.mal_id} layout initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: reduceMotion ? 0 : .24, ease: [0.23, 1, 0.32, 1], delay: reduceMotion ? 0 : Math.min(index, 8) * .018 }}>
              <div className="tile-art">
                <button className="tile-cover-open" onClick={() => openManga(manga)} aria-label={`Ver detalles de ${manga.title}`}><ProductCover manga={manga} className="tile-cover" /></button>
                <motion.button className={`tile-like ${isFavorite(manga) ? 'is-favorite' : ''}`} whileTap={{ scale: .82 }} onClick={() => requestLike(manga)} aria-label={`${isFavorite(manga) ? 'Quitar de' : 'Añadir a'} favoritos: ${manga.title}`} aria-pressed={isFavorite(manga)}><Heart size={17} fill={isFavorite(manga) ? 'currentColor' : 'none'} /></motion.button>
                <motion.button className="tile-add" whileTap={{ scale: .94 }} onClick={(event) => addToCart(manga, event)} aria-label={`Añadir ${manga.title} al carrito`}><Plus size={16} /> Añadir</motion.button>
              </div>
              <button className="tile-copy" onClick={() => openManga(manga)}><strong>{manga.title}</strong><span>{manga.author}</span><b>{money(manga.price)} <small>MXN</small></b></button>
            </motion.article>
          )) : <div className="empty-results">No hay resultados para «{query}».<button onClick={() => setQuery('')}>Ver el catálogo completo</button></div>}
        </motion.div>
        <div className="catalog-bottom"><span>{apiState === 'offline' ? 'Colección local de muestra · importes ilustrativos' : 'Colección de manga seleccionada · importe ilustrativo por volumen'}</span><span>{visibleCatalog.length} títulos</span></div>
        {canLoadMore && visibleCatalog.length > 0 && <button className="load-more" onClick={loadMore}>Ver más mangas <ArrowDown size={15} /></button>}
      </section>

      <footer className="footer"><a className="wordmark" href="#inicio"><span className="mark-icon">M<span>·</span></span><span>MANGA<br /><b>INTEGRAL</b></span></a><span>Historias para leer sin prisa.</span><a className="footer-back" href="#inicio">Volver arriba <ArrowRight size={14} /></a></footer>
      </motion.div>}
      {(page === 'login' || page === 'register') && <motion.section className="auth-screen" key={page} initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -12 }} transition={{ duration: reduceMotion ? .12 : .32, ease: [0.16, 1, .3, 1] }}>
        <div className="auth-world"><span className="auth-world-mark">MI<span>·</span></span><h1>{page === 'register' ? 'Tu rincón de historias.' : 'Vuelve a tus historias.'}</h1><p>Guarda portadas, reúne tus compras de prueba y continúa explorando.</p><div className="auth-cover"><ProductCover manga={featured[slide] || featured[0]} className="auth-world-cover" /></div><span className="auth-world-title">{featured[slide]?.title || 'Manga Integral'}</span></div>
        <div className="auth-form-side"><button className="auth-back" onClick={() => navigate('home')}><ArrowLeft size={15} /> Volver a la tienda</button><div className="auth-form-content"><p className="auth-heading-note">{page === 'register' ? 'CREA TU CUENTA LOCAL' : 'ACCEDE A TU CUENTA'}</p><h2>{page === 'register' ? 'Únete a la lectura' : 'Inicia sesión'}</h2><p className="auth-intro">{page === 'register' ? 'Tus favoritos y compras de muestra se guardan en este navegador.' : 'Accede a tus favoritos y tu historial de compras de muestra.'}</p>
          <form className="form-panel auth-form" onSubmit={signIn} noValidate>
            {page === 'register' && <label>Nombre<input type="text" name="name" autoComplete="name" required minLength={2} maxLength={60} placeholder="¿Cómo te llamamos?" value={authName} aria-invalid={Boolean(authError && authName.trim().length < 2)} onChange={(event) => { setAuthName(event.target.value); setAuthError('') }} /></label>}
            <label>Correo electrónico<input type="email" name="email" autoComplete="email" required placeholder="tu@correo.com" value={email} aria-invalid={Boolean(authError && !emailIsValid(email))} onChange={(event) => { setEmail(event.target.value); setAuthError('') }} /></label>
            <label>Contraseña<input type="password" name="password" autoComplete={page === 'register' ? 'new-password' : 'current-password'} required minLength={page === 'register' ? 6 : 1} placeholder={page === 'register' ? 'Mínimo 6 caracteres' : 'Tu contraseña'} value={authPassword} aria-invalid={Boolean(authError && (page === 'register' ? passwordRules(authPassword).some(([, valid]) => !valid) : true))} onChange={(event) => { setAuthPassword(event.target.value); setAuthError('') }} /></label>
            {page === 'register' && <><ul className="password-rules" aria-label="Requisitos de contraseña">{passwordRules(authPassword).map(([rule, valid]) => <li key={rule} className={valid ? 'rule-valid' : ''}><span>{valid ? <Check size={10} /> : '·'}</span>{rule}</li>)}</ul><label>Confirmar contraseña<input type="password" name="confirm-password" autoComplete="new-password" required minLength={6} placeholder="Escríbela de nuevo" value={authConfirm} aria-invalid={Boolean(authConfirm && authPassword !== authConfirm)} onChange={(event) => { setAuthConfirm(event.target.value); setAuthError('') }} /></label></>}
            {authError && <motion.p className="auth-error" role="alert" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>{authError}</motion.p>}
            <motion.button className="button-primary full-button" type="submit" disabled={authBusy} whileTap={{ scale: .98 }}>{authBusy ? 'Guardando…' : page === 'register' ? 'Crear cuenta' : 'Iniciar sesión'} <ArrowRight size={15} /></motion.button>
            <small>Sin servidor ni envío de datos. La sesión y la cuenta existen solo en este navegador.</small>
          </form>
          <p className="auth-route-switch">{page === 'register' ? '¿Ya tienes cuenta?' : '¿Aún no tienes cuenta?'} <button onClick={() => { setAuthError(''); setAuthPassword(''); setAuthConfirm(''); const next = page === 'register' ? 'login' : 'register'; setAuthMode(next); navigate(next) }}>{page === 'register' ? 'Inicia sesión' : 'Crea una cuenta'}</button></p>
        </div></div>
      </motion.section>}
      {page === 'details' && selectedManga && <motion.section className="detail-page" key={`detail-${selectedManga.mal_id}`} aria-label={`Detalles de ${selectedManga.title}`} initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -12 }} transition={{ duration: reduceMotion ? .12 : .34, ease: [0.16, 1, .3, 1] }}>
        <div className="detail-topline"><button className="auth-back" onClick={() => navigate('home')}><ArrowLeft size={15} /> Volver a explorar</button><span>Ficha del manga</span></div>
        <div className="detail-layout"><motion.div className="detail-page-art" initial={reduceMotion ? false : { opacity: 0, x: -18, rotate: -1.5 }} animate={{ opacity: 1, x: 0, rotate: 0 }} transition={{ duration: .48, delay: .06 }}><ProductCover manga={{ ...selectedManga, image: selectedManga.coverImage?.extraLarge || selectedManga.image }} className="detail-page-cover" /></motion.div>
          <motion.div className="detail-page-copy" initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .38, delay: .12 }}><h1>{selectedManga.title}</h1>{selectedManga.subtitle && <p className="detail-original-title">{selectedManga.subtitle}</p>}<p className="detail-page-author">{selectedManga.author}</p>
            <div className="detail-page-facts">{(selectedManga.genres?.map((item) => typeof item === 'string' ? item : item.name).join(' · ') || selectedManga.genre) && <span>{selectedManga.genres?.length ? selectedManga.genres.map((item) => typeof item === 'string' ? item : item.name).join(' · ') : selectedManga.genre}</span>}{selectedManga.year || selectedManga.startDate?.year ? <span>{selectedManga.year || selectedManga.startDate.year}</span> : null}{selectedManga.volumes ? <span>{selectedManga.volumes} volúmenes</span> : null}{selectedManga.chapters ? <span>{selectedManga.chapters} capítulos</span> : null}{selectedManga.score ? <span><Star size={12} fill="currentColor" /> {Number(selectedManga.score).toFixed(1)}</span> : selectedManga.averageScore ? <span><Star size={12} fill="currentColor" /> {(selectedManga.averageScore / 10).toFixed(1)}</span> : null}</div>
            <p className="detail-page-synopsis">{selectedManga.synopsis || selectedManga.description || 'Sinopsis no disponible para este título.'}</p><div className="detail-page-stock"><span>Disponibilidad</span><strong>Volumen de muestra</strong></div><div className="detail-page-price"><span>Precio de muestra</span><strong>{money(selectedManga.price)} MXN</strong></div>
            <div className="detail-actions"><motion.button className="button-primary" whileHover={{ scale: 1.025 }} whileTap={{ scale: .96 }} onClick={(event) => { addToCart(selectedManga, event); navigate('home') }}>Añadir a la bolsa <Plus size={15} /></motion.button><motion.button className="detail-buy" whileTap={{ scale: .97 }} onClick={() => buyNow(selectedManga)}>Comprar ahora <ArrowRight size={15} /></motion.button><motion.button className={`detail-like ${isFavorite(selectedManga) ? 'is-favorite' : ''}`} whileTap={{ scale: .84, rotate: -10 }} onClick={() => requestLike(selectedManga)} aria-label={isFavorite(selectedManga) ? 'Quitar de favoritos' : 'Añadir a favoritos'} aria-pressed={isFavorite(selectedManga)}><Heart size={19} fill={isFavorite(selectedManga) ? 'currentColor' : 'none'} /></motion.button></div><small className="detail-price-note">Precio y disponibilidad de ejemplo; esta tienda no procesa pedidos reales.</small>
          </motion.div>
        </div>
      </motion.section>}
      {page === 'profile' && user && <motion.section className="profile-page" key="profile" aria-label="Perfil de usuario" initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }} transition={{ duration: reduceMotion ? .12 : .3, ease: [0.16, 1, .3, 1] }}>
        <div className="profile-page-top"><button className="auth-back" onClick={() => navigate('home')}><ArrowLeft size={15} /> Volver a la tienda</button><span>CUENTA LOCAL</span></div>
        <div className="profile-page-heading"><div><p className="auth-heading-note">TU ESPACIO PERSONAL</p><button className="profile-identity-trigger profile-name-trigger" onClick={() => { setProfileName(profiles[user]?.name || user.split('@')[0]); setProfileEditor('name') }} aria-label="Editar nombre de perfil">{profiles[user]?.name || user.split('@')[0]} <span>Editar nombre <ArrowRight size={13} /></span></button><p>Tus mangas guardados y las compras de tu cuenta.</p></div><motion.button className="profile-page-avatar" whileHover={reduceMotion ? undefined : { scale: 1.05 }} whileTap={{ scale: .94 }} onClick={() => setProfileEditor('avatar')} aria-label="Editar foto de perfil"><AvatarPortrait avatar={PROFILE_AVATARS.find((avatar) => avatar.id === profiles[user]?.avatarId) || PROFILE_AVATARS[0]} /><span>Editar foto</span></motion.button></div>
        <AnimatePresence initial={false}>
          {profileEditor && <motion.section className="profile-editor" key={profileEditor} aria-label={profileEditor === 'name' ? 'Editar nombre' : 'Elegir foto de perfil'} initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6, height: 0 }} transition={{ duration: reduceMotion ? .12 : .22, ease: [0.16, 1, .3, 1] }}>
            <div className="profile-editor-heading"><h2>{profileEditor === 'name' ? 'Cambiar nombre' : 'Cambiar foto de perfil'}</h2><button className="profile-editor-close" onClick={() => setProfileEditor('')} aria-label="Cerrar edición"><X size={17} /></button></div>
            {profileEditor === 'name' ? <form className="profile-edit-form" onSubmit={saveProfile}><label>Nombre de usuario<input autoFocus type="text" value={profileName} minLength={2} maxLength={60} required onChange={(event) => setProfileName(event.target.value)} /></label><button className="button-primary" type="submit">Guardar nombre <Check size={15} /></button></form> : <div className="profile-avatar-picker"><div className="profile-section-heading"><h2>Elige una imagen</h2><span>6 disponibles</span></div><div className="avatar-options">{PROFILE_AVATARS.map((avatar) => <motion.button key={avatar.id} type="button" className={`avatar-option ${profiles[user]?.avatarId === avatar.id || (!profiles[user]?.avatarId && avatar.id === 'rudo') ? 'is-selected' : ''}`} aria-pressed={profiles[user]?.avatarId === avatar.id || (!profiles[user]?.avatarId && avatar.id === 'rudo')} onClick={() => setProfileAvatar(avatar.id)} whileHover={reduceMotion ? undefined : { y: -3 }} whileTap={{ scale: .96 }}><AvatarPortrait avatar={avatar} /><span>{avatar.name}</span></motion.button>)}</div></div>}
          </motion.section>}
        </AnimatePresence>
        <div className="profile-page-lists"><section className="profile-section"><div className="profile-section-heading"><h2><Heart size={17} /> Tus mangas guardados</h2><span>{favoriteMangas.length}</span></div>
          {favoriteMangas.length ? <div className="profile-manga-list">{favoriteMangas.map((manga) => <div className="profile-manga-row" key={manga.mal_id}><button className="profile-manga-open" onClick={() => openManga(manga)}><ProductCover manga={manga} className="profile-cover" /><span><strong>{manga.title}</strong><small>{manga.author}</small></span></button><motion.button className="profile-remove" whileTap={{ scale: .88 }} onClick={() => requestLike(manga)} aria-label={`Quitar ${manga.title} de favoritos`}><Heart size={17} fill="currentColor" /></motion.button></div>)}</div> : <p className="profile-empty">Aún no guardas mangas. Toca el corazón en una portada para empezar.</p>}
        </section><section className="profile-section"><div className="profile-section-heading"><h2><BookOpen size={17} /> Compras realizadas</h2><span>{userOrders.reduce((sum, order) => sum + order.items.length, 0)}</span></div>
          {userOrders.length ? <div className="profile-orders">{[...userOrders].reverse().map((order) => <div className="profile-order" key={order.id}><div className="profile-order-heading"><span>{order.id}</span><time><CalendarDays size={13} /> {new Date(order.purchasedAt).toLocaleDateString('es-MX')}</time></div>{order.items.map((item) => <div className="profile-purchased-row" key={`${order.id}-${item.id}`}><button onClick={() => { const manga = mangaById.get(String(item.id)) || { ...item, mal_id: item.id }; openManga(manga) }}>{item.title} <small>× {item.quantity}</small></button><b>{money(item.price * item.quantity)} MXN</b></div>)}</div>)}</div> : <p className="profile-empty">Tus compras de prueba aparecerán aquí cuando completes un pedido.</p>}
        </section></div>
        <button className="profile-logout" onClick={() => { setUser(''); navigate('home'); setNotice('Sesión local cerrada') }}>Cerrar sesión <ArrowRight size={14} /></button>
      </motion.section>}
      </AnimatePresence>

      <AnimatePresence>
        {activePanel && <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) setActivePanel('') }}>
          <motion.aside className={`side-panel ${activePanel === 'cart' ? 'cart-panel' : 'account-panel'}`} role="dialog" aria-modal="true" aria-label={activePanel === 'cart' ? 'Tu carrito' : activePanel === 'profile' ? 'Tu perfil' : 'Pago de prueba'} initial={{ transform: reduceMotion ? 'none' : 'translateX(100%)', opacity: 1 }} animate={{ transform: 'translateX(0)', opacity: 1 }} exit={{ transform: reduceMotion ? 'none' : 'translateX(100%)', opacity: 1 }} transition={{ duration: reduceMotion ? 0 : 0.24, ease: [0.32, 0.72, 0, 1] }}>
            <div className="panel-heading"><h2>{activePanel === 'cart' ? 'Tu bolsa' : activePanel === 'profile' ? 'Tu perfil' : 'Pago de prueba'}</h2><button className="close-panel" onClick={() => setActivePanel('')} aria-label="Cerrar"><X size={19} /></button></div>
            {activePanel === 'cart' && <>
              <p className="panel-caption">{itemCount ? `${itemCount} ${itemCount === 1 ? 'volumen' : 'volúmenes'} en tu selección` : 'Tu próxima lectura empieza aquí.'}</p>
              <div className="cart-items">{cart.map((item) => <div className="cart-item" key={item.id}><ProductCover manga={item} className="cart-cover" /><div className="cart-item-main"><strong>{item.title}</strong><span>{item.author}</span><b>{money(item.price)} <small>MXN · DEMO</small></b><div className="quantity-control"><button onClick={() => updateQuantity(item.id, -1)} aria-label={`Quitar uno de ${item.title}`}><Minus size={13} /></button><span>{item.quantity}</span><button onClick={() => updateQuantity(item.id, 1)} aria-label={`Añadir uno de ${item.title}`}><Plus size={13} /></button></div></div></div>)}</div>
              {cart.length === 0 && <div className="cart-empty"><ShoppingBag size={30} /><p>La bolsa está vacía</p><button onClick={() => { setActivePanel(''); document.querySelector('#catalogo')?.scrollIntoView({ behavior: 'smooth' }) }}>Explorar manga <ArrowRight size={14} /></button></div>}
              {cart.length > 0 && <div className="cart-summary"><div><span>Subtotal (muestra)</span><strong>{money(cartTotal)} MXN</strong></div><small>Importes de demostración. No corresponden a precios oficiales ni se procesará ningún pago.</small><button className="button-primary full-button" onClick={() => { setCheckoutDone(false); setActivePanel('checkout') }}>Continuar al pago <ArrowRight size={15} /></button></div>}
            </>}
            {activePanel === 'checkout' && <>{checkoutDone ? <div className="checkout-success"><span><Check size={25} /></span><h3>Pedido de prueba listo.</h3><p>La compra de prueba se completó localmente. No se procesó ningún pago ni se almacenaron datos de tarjeta.</p><button className="button-primary full-button" onClick={() => setActivePanel('')}>Volver a la tienda <ArrowRight size={15} /></button></div> : <form className="form-panel payment-form" onSubmit={submitOrder}><div className="safe-payment"><CreditCard size={17} /><span>DATOS DE PRUEBA · SIN PROCESAMIENTO</span></div><p>Usa cualquier dato para recorrer la demostración. No escribas información real: los campos solo simulan el formulario.</p><label>Nombre en la tarjeta<input type="text" name="cc-name" autoComplete="cc-name" required placeholder="Nombre Apellido" /></label><label>Número de tarjeta<input type="text" name="cc-number" autoComplete="cc-number" inputMode="numeric" maxLength={23} required placeholder="0000 0000 0000 0000" onChange={(event) => { event.target.value = event.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim() }} /></label><div className="payment-row"><label>Vencimiento<input type="text" name="cc-exp" autoComplete="cc-exp" inputMode="numeric" maxLength={4} placeholder="MMYY" required onChange={(event) => { event.target.value = event.target.value.replace(/\D/g, '').slice(0, 4) }} /></label><label>Código de seguridad<input type="password" name="cc-csc" autoComplete="cc-csc" inputMode="numeric" maxLength={4} placeholder="•••" required /></label></div><label>Correo del pedido<input type="email" name="email" autoComplete="email" required placeholder="tu@correo.com" defaultValue={user} /></label><div className="checkout-total"><span>Total (importe de muestra)</span><strong>{money(cartTotal)} MXN</strong></div><button className="button-primary full-button" type="submit">Finalizar prueba <ArrowRight size={15} /></button><small>Este formulario no verifica la autenticidad de la tarjeta ni realiza transacciones.</small></form>}</>}
          </motion.aside>
        </motion.div>}
      </AnimatePresence>
      <AnimatePresence>{flight && <motion.div key={flight.id} className="flight-cover" style={{ left: flight.from.left, top: flight.from.top, width: flight.from.width, height: flight.from.height }} initial={{ transform: 'translate(0, 0) scale(1)', opacity: 1 }} animate={{ transform: `translate(${flight.to.x}px, ${flight.to.y}px) scale(.18)`, opacity: .22 }} transition={{ duration: .58, ease: [0.77, 0, 0.175, 1] }} onAnimationComplete={() => { addNow(flight.manga); setFlight(null) }}><img src={flight.src} alt="" /></motion.div>}</AnimatePresence>
      <AnimatePresence>{notice && <motion.div className={`toast ${loginInvite && !user ? 'toast-invite' : ''}`} role="status" initial={{ opacity: 0, transform: 'translate(-50%, 10px)' }} animate={{ opacity: 1, transform: 'translate(-50%, 0)' }} exit={{ opacity: 0, transform: 'translate(-50%, 6px)' }} transition={{ duration: reduceMotion ? 0 : 0.18, ease: [0.23, 1, 0.32, 1] }}><Check size={15} />{notice}{loginInvite && !user && <button onClick={() => { setLoginInvite(false); setAuthMode('login'); setAuthError(''); navigate('login'); setNotice('') }}>Iniciar sesión <ArrowRight size={13} /></button>}</motion.div>}</AnimatePresence>
    </main>
  )
}

export default App
