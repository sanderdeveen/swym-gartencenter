class CollectionFiltersForm extends HTMLElement {

  constructor() {
    super();
    this.filterData = [];
    this.onActiveFilterClick = this.onActiveFilterClick.bind(this);
    this.debouncedOnSubmit = debounce((event) => {
      this.onSubmitHandler(event);
    }, 500);
    this.querySelector('form').addEventListener('input', this.debouncedOnSubmit.bind(this));
    window.addEventListener('popstate', this.onHistoryChange.bind(this));
    this.displayFilters();
  }

  /**
   * onSubmitHandler
   * @param {Object} event 
   */
  onSubmitHandler(event) {
    event.preventDefault();
    const formData = new FormData(event.target.closest('form'));
    const searchParams = new URLSearchParams(formData).toString();
    this.renderPage(searchParams, event);
  }

  /**
   * onActiveFilterClick
   * @param {Object} event 
   */
  onActiveFilterClick(event) {
    event.preventDefault();
    this.toggleActiveFilters();
    this.renderPage(new URL(event.currentTarget.href).searchParams.toString());
  }

  /**
   * onHistoryChange
   * @param {Object} event 
   */
  onHistoryChange(event) {
    const searchParams = event.state?.searchParams || '';
    this.renderPage(searchParams, null, false);
  }

  /**
   * toggleActiveFilters
   * @param {Boolean} disable 
   */
  toggleActiveFilters(disable = true) {
    document.querySelectorAll('.js-filter-remove').forEach((element) => {
      element.classList.toggle('disabled', disable);
    });
    this.displayFilters();
  }

  /**
   * renderPage
   * @param {String} searchParams 
   * @param {Object} event 
   * @param {Boolean} updateURLHash 
   */
  renderPage(searchParams, event, updateURLHash = true) {

    const sections = this.getSections();
    document.querySelector('[data-loader]').classList.remove('hidden');

    sections.forEach((section) => {
      const url = `${window.location.pathname}?section_id=${section.section}&${searchParams}`;
      const filterDataUrl = element => element.url === url;

      this.filterData.some(filterDataUrl) ?
        this.renderSectionFromCache(filterDataUrl, event) :
        this.renderSectionFromFetch(url, event);
    });

    if (updateURLHash) this.updateURLHash(searchParams);
  }

  /**
   * renderSectionFromFetch
   * @param {String} url 
   * @param {Object} event 
   */
  renderSectionFromFetch(url, event) {
    fetch(url)
    .then(response => response.text())
    .then((responseText) => {
      const html = responseText;
      this.filterData = [...this.filterData, { html, url }];
      this.renderFilters(html, event);
      this.renderProductGrid(html);
    });
  }

  /**
   * renderSectionFromCache
   * @param {String} filterDataUrl 
   * @param {Object} event 
   */
  renderSectionFromCache(filterDataUrl, event) {
    const html = this.filterData.find(filterDataUrl).html;
    this.renderFilters(html, event);
    this.renderProductGrid(html);
  }

  /**
   * renderProductGrid
   * @param {Node} html 
   */
  renderProductGrid(html) {
    document.getElementById('CollectionProductGrid').innerHTML = new DOMParser().parseFromString(html, 'text/html').getElementById('CollectionProductGrid').innerHTML;
  }

  /**
   * renderFilters
   * @param {Node} html 
   * @param {Object} event 
   */
  renderFilters(html, event) {
    const parsedHTML = new DOMParser().parseFromString(html, 'text/html');
    const filterOptionElements = parsedHTML.querySelectorAll('#CollectionFiltersForm .js-filter');
    const matchesIndex = (element) => element.dataset.index === event?.target.closest('.js-filter')?.dataset.index;
    const filterOptionsToRender = Array.from(filterOptionElements).filter(element => !matchesIndex(element));

    filterOptionsToRender.forEach((element) => {
      document.querySelector(`.js-filter[data-index="${element.dataset.index}"]`).innerHTML = element.innerHTML;
    });

    this.renderActiveFilters(parsedHTML);
  }

  /**
   * renderActiveFilters
   * @param {*} html 
   * @returns 
   */
  renderActiveFilters(html) {
    const activeFiltersHeaderElement = document.querySelector('.active-filter-options__header');
    const activeFilterElement = html.querySelector('.active-filter-options');
    activeFiltersHeaderElement.parentNode.classList.add('active-filter-options--empty');
    if (!activeFilterElement) return

    activeFiltersHeaderElement.parentNode.classList.remove('active-filter-options--empty');
    document.querySelector('.active-filter-options').innerHTML = activeFilterElement.innerHTML;

    this.displayFilters();
    this.toggleActiveFilters(false);
  }

  /**
   * displayFilters
   */
  displayFilters() {
    const activeFiltersElement = document.querySelector('.active-filter-options');
    const activeFilters = document.querySelector('.active-filter-options__inner').children;
    const filterTotalWrapper = document.querySelector('.filters__total');
    // if there are active filters, remove the class so it displays and update the total in the filter button
    if (activeFilters.length > 0) {
      activeFiltersElement.classList.remove('active-filter-options--empty');
      filterTotalWrapper.innerHTML = '&nbsp;- ' + activeFilters.length;
    }
    // else add the class to hide and clear the button
    else {
      filterTotalWrapper.innerHTML = '';
      activeFiltersElement.classList.add('active-filter-options--empty');
      document.querySelector('.filter-options__clear-all').classList.add('disabled');
    }
    // check all filters and hide the ones with no options
    const filterLists = document.querySelectorAll('.filter-options__list');
    filterLists.forEach(list => (list.children.length === 0) ? list.closest('.js-filter').classList.add('hidden') : list.closest('.js-filter').classList.remove('hidden'));

    // Reinit collapsibles
    this.reInitCollapsibles();
  }

  /**
   * reInitCollapsibles
   */
  reInitCollapsibles() {
    const collapsibles = this.closest('collapsible-element');
    collapsibles.construct();
  }

  /**
   * updateURLHash
   * @param {String} searchParams 
   */
  updateURLHash(searchParams) {
    history.pushState({ searchParams }, '', `${window.location.pathname}${searchParams && '?'.concat(searchParams)}`);
  }

  /**
   * getSections
   * @returns Array
   */
  getSections() {
    return [
      {
        id: 'main-collection-content',
        section: document.getElementById('main-collection-content').dataset.id,
      }
    ]
  }
}

if (!customElements.get('collection-filters-form')) {
  customElements.define('collection-filters-form', CollectionFiltersForm);
}

class PriceRange extends HTMLElement {
  constructor() {
    super();
    this.querySelectorAll('input')
      .forEach(element => element.addEventListener('change', this.onRangeChange.bind(this)));

    this.setMinAndMaxValues();
  }

  onRangeChange(event) {
    this.adjustToValidValues(event.currentTarget);
    this.setMinAndMaxValues();
  }

  setMinAndMaxValues() {
    const inputs = this.querySelectorAll('input');
    const minInput = inputs[0];
    const maxInput = inputs[1];
    if (maxInput.value) minInput.setAttribute('max', maxInput.value);
    if (minInput.value) maxInput.setAttribute('min', minInput.value);
    if (minInput.value === '') maxInput.setAttribute('min', 0);
    if (maxInput.value === '') minInput.setAttribute('max', maxInput.getAttribute('max'));
  }

  adjustToValidValues(input) {
    const value = Number(input.value);
    const min = Number(input.getAttribute('min'));
    const max = Number(input.getAttribute('max'));

    if (value < min) input.value = min;
    if (value > max) input.value = max;
  }
}

if (!customElements.get('price-range')) {
  customElements.define('price-range', PriceRange);
}

class OptionRemove extends HTMLElement {
  constructor() {
    super();
    this.querySelector('a').addEventListener('click', (event) => {
      event.preventDefault();
      const form = this.closest('collection-filters-form') || document.querySelector('collection-filters-form');
      form.onActiveFilterClick(event);
    });
  }
}

if (!customElements.get('filter-remove')) {
  customElements.define('filter-remove', OptionRemove);
}
