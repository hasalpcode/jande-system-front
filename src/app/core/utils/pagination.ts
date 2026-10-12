import { computed, signal } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';

/**
 * Pagination côté client pour une liste déjà chargée en mémoire (tables de
 * paramétrage, référentiels...) - pas d'appel serveur par page.
 */
export function creerPagination<T>(source: () => T[], taillePage = 5) {
  const pageIndex = signal(0);
  const page = computed(() => {
    const debut = pageIndex() * taillePage;
    return source().slice(debut, debut + taillePage);
  });
  return {
    taillePage,
    pageIndex,
    page,
    onPageChange: (event: PageEvent) => pageIndex.set(event.pageIndex),
  };
}
