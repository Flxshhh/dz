#!/usr/bin/env python3
"""Генератор подразделов сайта Wirken.

Запуск:  python3 build.py
Создаёт katalog/*.html, novosti.html, video.html, kontakty.html.
Тексты взяты с wirkenrus.com и отредактированы по скиллу unslop
(обычный регистр вместо капса, без восклицаний и непроверяемых утверждений).
Главная страница index.html пишется вручную, её шапка совпадает с header() ниже.
"""
from html import escape
from pathlib import Path

ROOT = Path(__file__).parent
W = 'https://www.wirkenrus.com'
EXT = 'target="_blank" rel="noopener"'

# --------------------------------------------------------------------------
# Мини-чертежи (те же, что на главной) — по ключу раздела
# --------------------------------------------------------------------------
DRAWINGS = {
    'bend': '''<svg class="mini mini-bend" viewBox="0 0 120 90" aria-hidden="true">
  <path class="part die" d="M20 62 H48 L60 74 L72 62 H100 V84 H20 Z"/>
  <g class="m-sheet"><line class="sheet-l" x1="60" y1="59" x2="10" y2="59"/><line class="sheet-r" x1="60" y1="59" x2="110" y2="59"/></g>
  <path class="part m-punch" d="M54 6 H66 V40 L60 56 L54 40 Z"/>
</svg>''',
    'punch': '''<svg class="mini mini-punch" viewBox="0 0 120 90" aria-hidden="true">
  <rect class="part" x="8" y="62" width="104" height="8"/>
  <g class="holes"><circle cx="30" cy="66" r="3"/><circle cx="60" cy="66" r="3"/><circle cx="90" cy="66" r="3"/></g>
  <g class="m-striker"><rect class="part" x="48" y="6" width="24" height="24"/><rect class="part" x="55" y="30" width="10" height="26"/></g>
</svg>''',
    'grind': '''<svg class="mini mini-grind" viewBox="0 0 120 90" aria-hidden="true">
  <g class="m-wheel">
    <circle class="part" cx="50" cy="44" r="30"/>
    <circle class="thin" cx="50" cy="44" r="8"/>
    <path class="thin" d="M50 14 V22 M50 66 V74 M20 44 H28 M72 44 H80 M29 23 L35 29 M65 59 L71 65 M71 23 L65 29 M35 59 L29 65"/>
  </g>
  <rect class="part tool" x="80" y="58" width="32" height="8"/>
  <g class="m-sparks"><circle cx="82" cy="58" r="1.6"/><circle cx="84" cy="56" r="1.2"/><circle cx="83" cy="60" r="1.4"/><circle cx="86" cy="57" r="1"/></g>
</svg>''',
    'shear': '''<svg class="mini mini-shear" viewBox="0 0 120 90" aria-hidden="true">
  <path class="part die" d="M14 62 H62 V84 H14 Z"/>
  <line class="sheet-l" x1="10" y1="59" x2="110" y2="59"/>
  <path class="part m-blade" d="M58 8 H106 V40 L58 54 Z"/>
</svg>''',
    'knife': '''<svg class="mini mini-knife" viewBox="0 0 120 90" aria-hidden="true">
  <g class="m-knife">
    <path class="part" d="M10 20 H110 V44 H10 Z"/>
    <line class="thin" x1="10" y1="38" x2="110" y2="38"/>
    <circle class="thin" cx="26" cy="29" r="3.5"/><circle class="thin" cx="60" cy="29" r="3.5"/><circle class="thin" cx="94" cy="29" r="3.5"/>
  </g>
  <line class="sheet-l" x1="6" y1="62" x2="114" y2="62"/>
  <path class="part die" d="M10 66 H110 V82 H10 Z"/>
</svg>''',
}

DEFS = '''<svg width="0" height="0" style="position:absolute" aria-hidden="true">
    <defs>
      <pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="7" class="hatch-line"/>
      </pattern>
    </defs>
  </svg>'''

# --------------------------------------------------------------------------
# Данные разделов каталога
# --------------------------------------------------------------------------
TOOLS = [
    {
        'slug': 'w-bend', 'drawing': 'bend', 'name': 'W-bend',
        'title': 'Инструмент для листогибочных прессов',
        'short': 'Пуансоны, матрицы и оснастка',
        'lead': 'Пуансоны, матрицы и оснастка. Выберите систему крепления или пришлите чертёж детали — подберём инструмент для вашего пресса.',
        'pdf': '/files/86/catalog_rolleri_2011-pdf.pdf',
        'specs': [('Марка стали', '42CrMo'), ('Твёрдость рабочих поверхностей', '58±2 HRC'), ('Прочность материала', '900–1200 Н/мм²')],
        'list_title': 'Системы крепления', 'list_link': 'К инструменту',
        'list': [('PROMECAM-AMADA', '/katalog/instrument-dlya-gibochnyh-pressov/promecam-amada/', 'Пуансоны, матрицы, рояльная петля, специальный инструмент, системы крепления'),
                 ('TRUMPF-WILA', '/katalog/instrument-dlya-gibochnyh-pressov/trumpf-wila/', ''),
                 ('BEYELER', '/katalog/instrument-dlya-gibochnyh-pressov/beyeler/', ''),
                 ('GASPARINI', '/katalog/instrument-dlya-gibochnyh-pressov/gasparini/', ''),
                 ('COLGAR', '/katalog/instrument-dlya-gibochnyh-pressov/colgar/', ''),
                 ('LVD-WILA', '/katalog/instrument-dlya-gibochnyh-pressov/lvd-wila/', ''),
                 ('EHT', '/katalog/instrument-dlya-gibochnyh-pressov/eht-rolleri/', ''),
                 ('AMERICAN', '/katalog/instrument-dlya-gibochnyh-pressov/american/', '')],
        'help': [('Отправить чертёж детали', 'Подберём инструмент под геометрию изделия', '/chertezh.html'),
                 ('Расчёт параметров гибки', 'Посчитаем параметры для вашей задачи', '/raschet_parametrov.html'),
                 ('Инструмент другого производителя', 'Подберём замену тому, что у вас стоит', '/drugoy_proizvoditel.html')],
        'offer_title': 'От оснащения станка до специального решения',
        'offer': [('Инструмент со склада', 'Широкий выбор пуансонов, матриц и оснастки'),
                  ('Под ваш бюджет', 'Инструмент европейского или китайского производства'),
                  ('Первичное оснащение', 'Пуансоны, матрицы, подложки, прижимы и сопутствующая оснастка'),
                  ('Нестандартные задачи', 'Специальный инструмент для сложных профилей и нескольких гибов за один ход')],
        'note': 'Также поставляем инструмент ROLLERI, EUROSTAMP и других европейских производителей — со склада или под вашу задачу.',
        'extra_title': 'Оснастка и дополнительные решения',
        'extra': [('Системы крепления ROLLERI', 'Механические, гидравлические и пневматические — ускоряют замену инструмента'),
                  ('Защитная плёнка ROLFIM', 'Кладётся между инструментом и заготовкой, чтобы на полированном или окрашенном металле не оставалось следов'),
                  ('Вспомогательные приспособления', 'Для работы оператора, перенастройки оборудования и хранения инструмента')],
    },
    {
        'slug': 'w-punch', 'drawing': 'punch', 'name': 'W-punch',
        'title': 'Инструмент для координатно-пробивных прессов',
        'short': 'Пуансоны, матрицы и держатели',
        'lead': 'Пуансоны, матрицы и держатели для координатно-пробивных прессов, пресс-ножниц и линий с ЧПУ. Совместимы с инструментом Mate, Ketec, Pass, Trumpf, Wilson и других производителей.',
        'pdf': '/files/467/_thickturret2017engcompressed-pdf.pdf',
        'list_title': 'Системы инструмента', 'list_link': 'К инструменту',
        'list': [('Thick Turret', '/katalog/matrix_instrument/thick_turret_instrument/', 'Пуансоны и матрицы для пробивных станков'),
                 ('Формовочный инструмент', '/katalog/matrix_instrument/Jet_former_instrument/', 'Jetformer'),
                 ('Multitool', '/katalog/matrix_instrument/Multitool_instrument/', ''),
                 ('Trumpf', '/katalog/matrix_instrument/trumpf_instrument/', 'Пуансоны и матрицы системы TRUMPF'),
                 ('Euromac', '/katalog/matrix_instrument/euromac_tools/', ''),
                 ('Durma', '/katalog/matrix_instrument/DURMA/', ''),
                 ('Ermaksan', '/katalog/matrix_instrument/ermaksan/', ''),
                 ('Юстировочный инструмент', '/katalog/matrix_instrument/centering_tools/', '')],
        'help': [('Инструмент другого производителя', 'Подберём аналог тому, что у вас стоит', '/drugoy_proizvoditel_pressy.html'),
                 ('Подбор зазора для матриц', 'Рассчитаем зазор под материал и толщину', '/podbor-zazora-dlya-matrits.html'),
                 ('Подбор по чертежу', 'Подберём инструмент под ваше изделие', '/chertezh.html')],
        'offer_title': 'Что мы предлагаем',
        'offer': [('Комплектация на любой бюджет', 'Инструмент европейского и американского производства или производства Китая'),
                  ('Первичное оснащение станков', 'Составим перечень инструмента для нового станка'),
                  ('Нестандартные решения', 'Маленькие отверстия в толстом листе, нестандартные формы отверстий, формовка любой сложности'),
                  ('На складе', 'Направляющие, пуансоны и матрицы')],
        'note': 'Собственная марка WIRKEN — инструмент с контролем производства на всех этапах. WIRKEN RUS — официальный дилер MATRIX (Италия).',
        'prose': [('Для каких станков',
                   ['Инструмент подходит для координатно-пробивных станков AMADA, FINN-POWER, LVD, Rainer, TRUMPF, WIEDEMANN, EUROMAC, SCHIAVI, IMAC, GASPARINI, HACO, DURMA, ERMAKSAN и других.',
                    'А также для пресс-ножниц и автоматических линий с ЧПУ: FICEP, GEKA, DALCOS, OMERA, MUBEA, PEDDINGHAUS, KINGSLAND.'])],
    },
    {
        'slug': 'press-nozhnicy', 'drawing': 'shear', 'name': 'Пресс-ножницы',
        'title': 'Инструмент для комбинированных пресс-ножниц',
        'short': 'Пуансоны и матрицы для толстого металла и проката',
        'lead': 'Инструмент и оснастка для универсальных пресс-ножниц и линий с ЧПУ: FICEP, GEKA, IMS, OMERA, MUBEA, PEDDINGHAUS, KINGSLAND и других.',
        'pdf': '/files/565/fabzvp00rev0410-pdf.pdf',
        'specs': [('Сталь пуансонов', '58WCr9KU'), ('Выдерживает нагрузку', '2000 Н/мм²'), ('Рабочее давление', 'до 1500 Н/мм²')],
        'list_title': 'Подбор по станку', 'list_link': 'К инструменту',
        'list': [('GEKA', '/katalog/instrument-dlya-kombinirovannyh-press-nozhnits/geka/', ''),
                 ('FICEP', '/katalog/instrument-dlya-kombinirovannyh-press-nozhnits/FICEP/', ''),
                 ('KINGSLAND', '/katalog/instrument-dlya-kombinirovannyh-press-nozhnits/kingsland/', ''),
                 ('OMERA', '/katalog/instrument-dlya-kombinirovannyh-press-nozhnits/OMERA/', ''),
                 ('DURMA', '/katalog/instrument-dlya-kombinirovannyh-press-nozhnits/durma-iw/', ''),
                 ('ERMAKSAN', '/katalog/instrument-dlya-kombinirovannyh-press-nozhnits/ERMAKSAN_IW/', ''),
                 ('SAHINLER', '/katalog/instrument-dlya-kombinirovannyh-press-nozhnits/sahinler-iw/', '')],
        'prose': [('Какая нужна прочность',
                   ['Обычно пробивают мягкую или низколегированную сталь. Материал с более высоким пределом прочности требует специальных пуансонов, которые выдерживают большие нагрузки.',
                    'Закалённая инструментальная сталь выдерживает 2000 Н/мм² и спокойно работает при давлении до 1500 Н/мм² — с хорошим качеством пробивки и долгим сроком службы.',
                    'При заказе укажите тип материала и его толщину.']),
                  ('Маленькое отверстие в толстом листе',
                   ['Традиционное правило: диаметр пуансона должен быть больше толщины листа. Гидравлическая штамповка позволяет регулировать скорость и частично обойти это правило.',
                    'Отверстия меньше толщины листа пробить можно, но инструмент при этом изнашивается быстрее.']),
                  ('Как делается инструмент',
                   ['Весь инструмент для пресс-ножниц изготавливается на высокотехнологичном оборудовании из стали 58WCr9KU. Особое внимание — размерам, осевой точности и шероховатости режущей части.',
                    'Каждый инструмент проверяется компьютеризированными системами.'])],
    },
    {
        'slug': 'w-grind', 'drawing': 'grind', 'name': 'W-grind',
        'title': 'Станки для заточки инструмента',
        'short': 'Автоматические, полуавтоматические и ручные',
        'lead': 'Станки для заточки пуансонов и матриц — от ручных до полностью автоматических — и демагнитизатор инструмента.',
        'list_title': 'Модели', 'list_link': 'Подробнее',
        'list': [('Автоматический заточной станок', '/katalog/vspomogatelnoe-oborudovanie/avtomaticheskie-zatochnye-stanki/', 'Устанавливаете инструмент и вводите параметры — остальное станок делает сам'),
                 ('Полуавтоматический заточной станок', '/katalog/vspomogatelnoe-oborudovanie/matrix-tgm150s.html', 'MATRIX TGM150S'),
                 ('Ручной заточной станок', '/katalog/vspomogatelnoe-oborudovanie/Edgemaster.html', 'NIBBLER Edgemaster'),
                 ('Демагнитизатор инструмента', '/katalog/vspomogatelnoe-oborudovanie/demagnitizer.html', 'Снимает остаточное магнитное поле после шлифовки')],
        'callout': ('0,15 мм', 'Когда радиус кромки приближается к этому значению, инструмент пора затачивать — тогда его ресурс будет максимальным'),
        'prose': [('Как выбрать заточной станок',
                   ['Заточка пробивного инструмента нужна для бесперебойной работы станка и качества изделий. Отдавать инструмент на сторону — значит простаивать, а плоскошлифовальный станок требует высокой квалификации оператора и может перегреть инструмент.',
                    'Полуавтоматический станок упрощает процесс: вы устанавливаете инструмент, сами задаёте нулевую точку и параметры переточки. Полностью автоматическому нужны только инструмент и параметры — от оператора вы больше не зависите.',
                    'Обратите внимание, нужны ли дополнительные приспособления для разных типов пуансонов и матриц и умеет ли станок затачивать под углом: опции заметно влияют на цену.',
                    'Лучшие шлифовальные круги — из кубического нитрида бора: у них больше ресурс и они не требуют правки. СОЖ обязательна, и важно, как станок её очищает — эффективнее всего многоступенчатые системы.']),
                  ('Зачем демагнитизатор',
                   ['При шлифовке инструмент намагничивается, и при пробивке к нему налипают отходы. Демагнитизатор снимает остаточное магнитное поле.'])],
    },
    {
        'slug': 'nozhi', 'drawing': 'knife', 'name': 'Ножи',
        'title': 'Ножи для гильотинных ножниц',
        'short': 'Ножи для гильотин и для продольной резки металла',
        'lead': 'Ножи из легированной стали 58SiMo8 режут и обычную, и нержавеющую сталь. Для самых сложных задач делаем лезвия из вольфрамового сплава.',
        'specs': [('Сталь', '58SiMo8'), ('Длина ножа', 'до 6000 мм'), ('Для сложных задач', 'вольфрамовый сплав')],
        'need': ['Чертёж лезвия или модель станка', 'Тип разрубаемого материала', 'Максимальная толщина листа'],
        'prose': [('Для каких станков',
                   ['GASPARINI, VIMERCATI, COLGAR, WARCOM, FARINA, SCHIAVI, I.MA.L и других.'])],
    },
]

EQUIPMENT = [
    {
        'slug': 'listoobrabatyvayushchee', 'name': 'Листообрабатывающее',
        'title': 'Листообрабатывающее оборудование',
        'lead': 'Подберём оборудование для обработки листового металла под задачи вашего производства.',
        'list': [('Финишная обработка поверхности', '/katalog/listoobrabatyvayushee-oborudovanie/oborudovanie-dlya-finishnoy-obrabotki-poverhnosti/'),
                 ('Дисковые круговые ножницы', '/katalog/listoobrabatyvayushee-oborudovanie/diskovye-krugovye-nozhnitsy/'),
                 ('Валковые листогибочные машины', '/katalog/listoobrabatyvayushee-oborudovanie/valkovye-listogibochnye-mashiny/'),
                 ('Станки плазменной и газокислородной резки', '/katalog/listoobrabatyvayushee-oborudovanie/ustanovki-plazmennoy-rezki/'),
                 ('Установки лазерной резки', '/katalog/listoobrabatyvayushee-oborudovanie/ustanovki-lazernoy-rezki/'),
                 ('Отбортовка и фланжирование', '/katalog/listoobrabatyvayushee-oborudovanie/oborudovanie-dlya-otbortovki-i-flanzhirovaniya/'),
                 ('Ротационная вытяжка', '/katalog/listoobrabatyvayushee-oborudovanie/oborudovanie-dlya-rotatsionnoy-vytyazhki/'),
                 ('Снятие фасок', '/katalog/listoobrabatyvayushee-oborudovanie/oborudovanie-dlya-snyatiya-fasok3/')],
    },
    {
        'slug': 'truby', 'name': 'Для обработки труб',
        'title': 'Оборудование для обработки труб',
        'lead': 'Гибка, резка, пробивка и формирование концов труб — подберём оборудование под ваши изделия.',
        'list': [('Трубогибочное оборудование', '/katalog/oborudovanie-dlya-obrabotki-trub/trubogibochnoe-oborudovanie/'),
                 ('Резка труб', '/katalog/oborudovanie-dlya-obrabotki-trub/oborudovanie-dlya-rezki-trub/'),
                 ('Формирование концов труб', '/katalog/oborudovanie-dlya-obrabotki-trub/oborudovanie-dlya-formirovaniya-kontsov-trub/'),
                 ('Пробивка труб', '/katalog/oborudovanie-dlya-obrabotki-trub/oborudovanie-dlya-probivki-trub/'),
                 ('Очистка труб', '/katalog/oborudovanie-dlya-obrabotki-trub/oborudovanie-dlya-ochistki-trub/'),
                 ('Финишная обработка поверхности', '/katalog/oborudovanie-dlya-obrabotki-trub/oborudovanie-dlya-finishnoy-obrabotki-poverhnosti2/'),
                 ('Снятие фасок', '/katalog/oborudovanie-dlya-obrabotki-trub/oborudovanie-dlya-snyatiya-fasok/'),
                 ('Автоматизация гибки и формовки труб', '/katalog/oborudovanie-dlya-obrabotki-trub/page170/'),
                 ('Станки для изготовления присоединений', '/katalog/oborudovanie-dlya-obrabotki-trub/page175/')],
    },
    {
        'slug': 'profili', 'name': 'Для обработки профилей',
        'title': 'Оборудование для обработки профилей',
        'lead': 'Гибка, резка и пробивка профилей — подберём оборудование под ваши задачи.',
        'list': [('Профилегибочное оборудование', '/katalog/oborudovanie-dlya-obrabotki-profiley/profilegibochnoe-oborudovanie/'),
                 ('Резка профилей', '/katalog/oborudovanie-dlya-obrabotki-profiley/oborudovanie-dlya-rezki-profiley/'),
                 ('Пробивка профилей', '/katalog/oborudovanie-dlya-obrabotki-profiley/oborudovanie-dlya-probivki-profiley/'),
                 ('Финишная обработка поверхности', '/katalog/oborudovanie-dlya-obrabotki-profiley/oborudovanie-dlya-finishnoy-obrabotki-poverhnosti3/')],
    },
]

NEWS = [
    ('2026-05-15', '15 мая 2026', 'Ножи для продольной резки металла', '', '/novosti/nozhi-dlya-prodolnoy-rezki-metalla/'),
    ('2025-09-15', '15 сентября 2025', 'Автоматический заточной станок V8', 'Сенсорное управление, автоматический поиск поверхности и шлифование с охлаждением', '/novosti/stanok-dlya-zatochki-puansonov-i-matrits/'),
    ('2025-01-15', '15 января 2025', 'Защитная плёнка для гибки', '', '/novosti/gibka-bez-sledov/'),
    ('2023-04-20', '20 апреля 2023', 'Гибочный инструмент WIRKEN', '', '/novosti/news_wirken_bending/'),
    ('2022-07-04', '4 июля 2022', 'Прижимы листа для координатно-пробивных прессов', '', '/novosti/news_clamp_system/'),
    ('2022-05-16', '16 мая 2022', 'Пробивной инструмент WIRKEN', '', '/novosti/news_wirken_tools/'),
    ('2021-12-20', '20 декабря 2021', 'Новый компактный станок Fladder CC', '', '/novosti/news_fladder_cc/'),
    ('2021-02-10', '10 февраля 2021', 'Запуск станка VBU 2200 в Краснодарском крае', '', '/novosti/proizvodstvo-dorozhnyh-znakov/'),
    ('2020-06-20', '20 июня 2020', 'Ещё один станок для производства дорожных знаков введён в эксплуатацию в Приволжском ФО', '', '/novosti/stanok-dlya-dorozhnyh-znakov/'),
    ('2019-09-13', '13 сентября 2019', 'Сменные вставки iEM', 'Производительная система с простым и экономичным управлением инструментом', '/novosti/iEM_inserts.html'),
]

# --------------------------------------------------------------------------
# Общие части страницы
# --------------------------------------------------------------------------
NAV = [('Продукция', 'katalog/', 'katalog'), ('О компании', 'index.html#about', 'about'),
       ('Новости', 'novosti.html', 'news'), ('Видео', 'video.html', 'video'), ('Контакты', 'kontakty.html', 'contacts')]


def header(r, active):
    cur = ' aria-current="page"'
    links = ''.join(f'<a href="{r}{h}"{cur if k == active else ""}>{t}</a>' for t, h, k in NAV)
    return f'''<header class="top">
    <div class="wrap top-in">
      <a href="{r}index.html" class="logo"><img src="{r}img/logo.png" alt="Wirken" width="174" height="32"></a>
      <nav class="menu" aria-label="Основное меню">{links}</nav>
      <a href="tel:+78126122850" class="top-phone">(812) 612-28-50</a>
      <details class="burger">
        <summary aria-label="Меню"><span></span><span></span><span></span></summary>
        <nav class="burger-menu" aria-label="Меню">{links}<a href="tel:+78126122850">(812) 612-28-50</a></nav>
      </details>
    </div>
  </header>'''


def contacts_block(r):
    return f'''<section class="contacts">
      <div class="wrap contacts-in">
        <div>
          <h2>Нужна помощь с выбором?</h2>
          <p class="contacts-note">Пришлите чертёж детали или модель станка — рассчитаем стоимость в день обращения</p>
        </div>
        <div class="contacts-list">
          <a class="phone" href="tel:+78126122850">(812) 612-28-50</a>
          <a class="c-link" href="mailto:info@wirkenrus.com"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18v14H3z M3 6l9 7 9-7"/></svg>info@wirkenrus.com</a>
          <a class="c-link" href="https://t.me/AlPo79" {EXT}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 4 3 11l6 2 2 6 3-4 5 4z M9 13l8-6"/></svg>Написать в Telegram</a>
          <a class="c-link" href="{r}kontakty.html">Адрес и доставка</a>
        </div>
      </div>
    </section>'''


def page(r, active, title, desc, body, crumbs):
    crumbs_html = ' <span aria-hidden="true">/</span> '.join(
        f'<a href="{r}{h}">{t}</a>' if h else f'<span aria-current="page">{t}</span>' for t, h in crumbs)
    return f'''<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{escape(title)} — Wirken</title>
  <meta name="description" content="{escape(desc)}">
  <meta name="theme-color" content="#0b4a8b">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400&family=IBM+Plex+Sans:wght@400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="{r}style.css">
</head>
<body>
  <!-- Сгенерировано build.py — правьте данные там, а не этот файл -->
  {DEFS}
  {header(r, active)}
  <main>
    <nav class="wrap crumbs" aria-label="Навигационная цепочка">{crumbs_html}</nav>
{body}
  </main>
  <footer class="wrap foot">
    <span>© 2011–<span id="year">2026</span> WIRKEN</span>
    <a href="{W}/politika-konfidentsialnosti.html" {EXT}>Политика конфиденциальности</a>
  </footer>
  <button class="to-top" id="to-top" aria-label="Наверх">
    <svg class="ring" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="21"/></svg>
    <svg class="up" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
  </button>
  <script src="{r}script.js"></script>
</body>
</html>
'''


def rows_plain(items, link_label, external=True):
    """Строки списка без чертежа: название, описание, ссылка."""
    out = []
    for name, href, desc in items:
        url = W + href if external else href
        out.append(f'''<li><a class="row row--plain" href="{url}" {EXT if external else ''}>
            <span class="row-name">{escape(name)}</span>
            <span class="row-desc">{escape(desc)}</span>
            <span class="row-link">{link_label}</span>
          </a></li>''')
    return '<ul class="catalog">' + ''.join(out) + '</ul>'


def ticks(items):
    """Список с фирменной полоской: заголовок пункта и пояснение."""
    lis = ''.join(f'<li><b>{escape(t)}</b>{escape(d)}</li>' for t, d in items)
    return f'<ul class="ticks">{lis}</ul>'


def prose(sections):
    out = []
    for h, ps in sections:
        out.append(f'<h3>{escape(h)}</h3>' + ''.join(f'<p>{escape(p)}</p>' for p in ps))
    return '<div class="prose">' + ''.join(out) + '</div>'


# --------------------------------------------------------------------------
# Страницы
# --------------------------------------------------------------------------
def tool_page(t):
    r = '../'
    actions = '<a href="#list" class="btn btn-primary">' + escape(t.get('list_title', 'Связаться')) + '</a>' if t.get('list') else \
              '<a href="#contact" class="btn btn-primary">Запросить расчёт</a>'
    if t.get('pdf'):
        actions += f'<a href="{W}{t["pdf"]}" {EXT} class="btn btn-line">Каталог PDF</a>'
    specs = ''
    if t.get('specs'):
        specs = '<dl class="specs">' + ''.join(f'<div><dt>{escape(a)}</dt><dd>{escape(b)}</dd></div>' for a, b in t['specs']) + '</dl>'
    body = [f'''    <section class="wrap page-head">
      <div>
        <h1>{escape(t['title'])}</h1>
        <p class="lead">{escape(t['lead'])}</p>
        <div class="actions">{actions}</div>
      </div>
      <figure class="page-drawing">{DRAWINGS[t['drawing']]}</figure>
    </section>''']
    if specs:
        body.append(f'    <section class="wrap">{specs}</section>')
    if t.get('list'):
        body.append(f'''    <section id="list" class="wrap block">
      <h2>{escape(t['list_title'])}</h2>
      {rows_plain(t['list'], t['list_link'])}
      <p class="ext-note">Карточки инструмента открываются на сайте wirkenrus.com</p>
    </section>''')
    if t.get('callout'):
        v, d = t['callout']
        body.append(f'    <section class="wrap block"><div class="callout"><b>{escape(v)}</b><p>{escape(d)}</p></div></section>')
    if t.get('need'):
        need = ''.join(f'<li>{escape(x)}</li>' for x in t['need'])
        body.append(f'''    <section class="wrap block">
      <h2>Что нужно для расчёта</h2>
      <ul class="ticks ticks--simple">{need}</ul>
    </section>''')
    if t.get('help'):
        items = [(a, h, b) for a, b, h in t['help']]
        body.append(f'''    <section class="wrap block">
      <h2>Поможем с подбором</h2>
      {rows_plain(items, 'Открыть')}
    </section>''')
    if t.get('offer'):
        note = f'<p class="note">{escape(t["note"])}</p>' if t.get('note') else ''
        body.append(f'''    <section class="wrap block">
      <h2>{escape(t['offer_title'])}</h2>
      {ticks(t['offer'])}
      {note}
    </section>''')
    if t.get('extra'):
        body.append(f'''    <section class="wrap block">
      <h2>{escape(t['extra_title'])}</h2>
      {ticks(t['extra'])}
    </section>''')
    if t.get('prose'):
        body.append(f'    <section class="wrap block">{prose(t["prose"])}</section>')
    body.append('    <div id="contact"></div>' + contacts_block(r))
    return page(r, 'katalog', t['title'], t['lead'], '\n'.join(body),
                [('Главная', 'index.html'), ('Продукция', 'katalog/'), (t['name'], '')])


def equipment_page(e):
    r = '../'
    items = [(n, h, '') for n, h in e['list']]
    body = f'''    <section class="wrap page-head page-head--text">
      <div>
        <h1>{escape(e['title'])}</h1>
        <p class="lead">{escape(e['lead'])}</p>
      </div>
    </section>
    <section class="wrap block block--tight">
      {rows_plain(items, 'Подробнее')}
      <p class="ext-note">Описания и модели открываются на сайте wirkenrus.com</p>
    </section>
    {contacts_block(r)}'''
    return page(r, 'katalog', e['title'], e['lead'], body,
                [('Главная', 'index.html'), ('Продукция', 'katalog/'), (e['name'], '')])


def catalog_index():
    r = '../'
    tool_rows = ''.join(f'''<li><a class="row" href="{t['slug']}.html">
            {DRAWINGS[t['drawing']]}
            <span class="row-name">{escape(t['name'])}</span>
            <span class="row-desc">{escape(t['title'])}</span>
            <span class="row-link">Открыть раздел</span>
          </a></li>''' for t in TOOLS)
    eq_rows = rows_plain([(e['title'], f"{e['slug']}.html", '') for e in EQUIPMENT], 'Открыть раздел', external=False)
    body = f'''    <section class="wrap page-head page-head--text">
      <div>
        <h1>Продукция</h1>
        <p class="lead">Инструмент для листогибочных и координатно-пробивных прессов, станки для заточки и металлообрабатывающее оборудование.</p>
      </div>
    </section>
    <section class="wrap block block--tight">
      <h2>Инструмент</h2>
      <ul class="catalog">{tool_rows}</ul>
    </section>
    <section class="wrap block">
      <h2>Оборудование</h2>
      {eq_rows}
    </section>
    {contacts_block(r)}'''
    return page(r, 'katalog', 'Продукция', 'Каталог инструмента и оборудования Wirken', body,
                [('Главная', 'index.html'), ('Продукция', '')])


def news_page():
    r = ''
    lis = ''.join(f'''<li>
          <time datetime="{iso}">{human}</time>
          <div><a href="{W}{href}" {EXT}>{escape(t)}</a>{f'<p>{escape(d)}</p>' if d else ''}</div>
        </li>''' for iso, human, t, d, href in NEWS)
    body = f'''    <section class="wrap page-head page-head--text">
      <div>
        <h1>Новости</h1>
        <p class="lead">Инструмент, оборудование и решения WIRKEN.</p>
      </div>
    </section>
    <section class="wrap block block--tight">
      <ul class="news">{lis}</ul>
      <a class="more" href="{W}/novosti/" {EXT}>Архив новостей на wirkenrus.com</a>
    </section>
    {contacts_block(r)}'''
    return page(r, 'news', 'Новости', 'Новости компании Wirken', body, [('Главная', 'index.html'), ('Новости', '')])


def video_page():
    r = ''
    items = [('RUTUBE', 'https://rutube.ru/channel/79931475/', 'Видео о работе инструмента и оборудования'),
             ('YouTube', 'https://www.youtube.com/user/wirkenrus/videos', 'Тот же канал на YouTube')]
    rows = ''.join(f'''<li><a class="row row--plain" href="{h}" {EXT}>
            <span class="row-name">{n}</span><span class="row-desc">{d}</span><span class="row-link">Перейти на канал</span>
          </a></li>''' for n, h, d in items)
    body = f'''    <section class="wrap page-head page-head--text">
      <div>
        <h1>Видео</h1>
        <p class="lead">Смотрите, как работает инструмент и оборудование, на наших каналах.</p>
      </div>
    </section>
    <section class="wrap block block--tight"><ul class="catalog">{rows}</ul></section>
    {contacts_block(r)}'''
    return page(r, 'video', 'Видео', 'Видео Wirken на RUTUBE и YouTube', body, [('Главная', 'index.html'), ('Видео', '')])


def contacts_page():
    r = ''
    maps = 'https://yandex.ru/maps/?text=' + 'Ленинградская область Сертолово Индустриальная 1 корпус 2'.replace(' ', '%20')
    ways = [('Телефон', '(812) 612-28-50', 'tel:+78126122850', 'Позвонить'),
            ('Электронная почта', 'info@wirkenrus.com', 'mailto:info@wirkenrus.com', 'Написать письмо'),
            ('Telegram', 'Вопросы и подбор инструмента', 'https://t.me/AlPo79', 'Написать в Telegram'),
            ('MAX', 'Мессенджер', 'https://max.ru/u/f9LHodD0cOJmtgEEHGaNS0q4TPsHN6JmCrpELGghSAtLEagghqskSyStqUk', 'Написать в MAX')]
    rows = ''.join(f'''<li><a class="row row--plain" href="{h}" {'' if h.startswith(('tel', 'mailto')) else EXT}>
            <span class="row-name">{n}</span><span class="row-desc">{d}</span><span class="row-link">{l}</span>
          </a></li>''' for n, d, h, l in ways)
    body = f'''    <section class="wrap page-head page-head--text">
      <div>
        <h1>Контакты</h1>
        <p class="lead">Нужно оборудование, инструмент или помощь с подбором? Пришлите вопрос, чертёж детали или модель станка.</p>
      </div>
    </section>
    <section class="wrap block block--tight"><ul class="catalog">{rows}</ul></section>
    <section class="wrap block contact-grid">
      <div>
        <h2>Адрес</h2>
        <address>ООО «ВИРКЕН РУС»<br>188650, Ленинградская область, г. Сертолово,<br>ул. Индустриальная, д. 1, корп. 2</address>
        <a class="more" href="{maps}" {EXT}>Посмотреть на карте</a>
      </div>
      <div>
        <h2>Доставка</h2>
        <p class="muted-p">Отгружаем по России и в страны СНГ транспортными компаниями
          <a href="https://www.dellin.ru/" {EXT}>Деловые Линии</a> и <a href="https://pecom.ru/" {EXT}>ПЭК</a>.</p>
      </div>
    </section>'''
    return page(r, 'contacts', 'Контакты', 'Контакты, адрес и доставка Wirken', body, [('Главная', 'index.html'), ('Контакты', '')])


def main():
    (ROOT / 'katalog').mkdir(exist_ok=True)
    files = {'katalog/index.html': catalog_index(), 'novosti.html': news_page(),
             'video.html': video_page(), 'kontakty.html': contacts_page()}
    for t in TOOLS:
        files[f"katalog/{t['slug']}.html"] = tool_page(t)
    for e in EQUIPMENT:
        files[f"katalog/{e['slug']}.html"] = equipment_page(e)
    for name, html in files.items():
        (ROOT / name).write_text(html, encoding='utf-8')
    print('собрано страниц:', len(files))
    for n in files:
        print(' ', n)


if __name__ == '__main__':
    main()
