// apps/web/components/resources/ResourceLibraryClient.tsx
'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { ResourceArticle } from '@/lib/resources/articles';

interface ResourceLibraryClientProps {
  articles: ResourceArticle[];
  categories: string[];
}

export default function ResourceLibraryClient({
  articles,
  categories,
}: ResourceLibraryClientProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredArticles = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return articles.filter((article) => {
      const matchesCategory =
        selectedCategory === 'ALL' || article.category === selectedCategory;

      if (!matchesCategory) return false;
      if (!query) return true;

      return (
        article.title.toLowerCase().includes(query) ||
        article.excerpt.toLowerCase().includes(query) ||
        article.category.toLowerCase().includes(query) ||
        article.keywords.some((kw) => kw.toLowerCase().includes(query))
      );
    });
  }, [articles, selectedCategory, searchQuery]);

  const clearFilters = () => {
    setSelectedCategory('ALL');
    setSearchQuery('');
  };

  return (
    <div className="w-full">
      {/* Search & Category Filter Toolbar */}
      <div className="rounded-2xl bg-white border border-gray-200/90 p-4 sm:p-6 shadow-xs mb-10">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative w-full lg:max-w-md">
            <label htmlFor="resource-search" className="sr-only">
              Search hospitality guides by title, topic, or keyword
            </label>
            <svg
              className="w-4 h-4 text-servora-deepTeal/60 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1010.5 18a7.5 7.5 0 006.15-3.35z"
              />
            </svg>
            <input
              id="resource-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search guides (e.g. M-Pesa, KDS, BOM, food cost)..."
              className="w-full h-11 rounded-xl border border-gray-200 bg-servora-pale/40 pl-10 pr-4 text-xs sm:text-sm text-servora-navy placeholder:text-servora-deepTeal/50 focus:border-servora-core focus:bg-white focus:outline-none transition-colors"
            />
          </div>

          {/* Category Filter Pills */}
          <div
            role="group"
            aria-label="Filter resources by category"
            className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0"
          >
            <button
              type="button"
              onClick={() => setSelectedCategory('ALL')}
              aria-pressed={selectedCategory === 'ALL'}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === 'ALL'
                  ? 'bg-servora-core text-white shadow-sm'
                  : 'bg-servora-pale text-servora-navy hover:bg-servora-core/10 hover:text-servora-core'
              }`}
            >
              All Resources ({articles.length})
            </button>
            {categories.map((category) => {
              const count = articles.filter((a) => a.category === category).length;
              const isSelected = selectedCategory === category;
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  aria-pressed={isSelected}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-servora-core text-white shadow-sm'
                      : 'bg-servora-pale text-servora-navy hover:bg-servora-core/10 hover:text-servora-core'
                  }`}
                >
                  {category} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Article Results Grid */}
      {filteredArticles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {filteredArticles.map((article) => (
            <article
              key={article.slug}
              className="group flex flex-col justify-between rounded-3xl bg-white border border-gray-200/90 overflow-hidden shadow-xs hover:border-servora-core hover:shadow-lg transition-all"
            >
              <div>
                {/* Editorial Cover Image */}
                <div className="relative h-48 w-full overflow-hidden bg-servora-navy">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={article.coverImage}
                    alt={article.coverAlt}
                    loading="lazy"
                    className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                  />
                  {/* Contrast overlay for badges */}
                  <div className="absolute inset-0 bg-gradient-to-t from-servora-navy/90 via-servora-navy/35 to-servora-navy/25" />

                  <div className="absolute inset-0 p-5 flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex rounded-full bg-servora-navy/75 backdrop-blur-xs px-3 py-1 text-[10px] font-bold text-white uppercase tracking-wider ring-1 ring-white/15">
                        {article.category}
                      </span>
                      <span className="rounded-full bg-servora-navy/75 backdrop-blur-xs px-2.5 py-1 text-[11px] font-mono text-gray-100">
                        {article.readTime}
                      </span>
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-widest text-servora-teal">
                      {article.badgeLabel}
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-6 sm:p-7">
                  <h3 className="text-lg font-extrabold text-servora-navy leading-snug group-hover:text-servora-core transition-colors">
                    <Link href={`/resources/${article.slug}`}>{article.title}</Link>
                  </h3>
                  <p className="mt-3 text-xs sm:text-sm text-servora-deepTeal leading-relaxed">
                    {article.excerpt}
                  </p>
                </div>
              </div>

              {/* Card Footer */}
              <div className="px-6 sm:px-7 pb-6 pt-4 border-t border-gray-100 flex items-center justify-between">
                <time dateTime={article.date} className="text-[11px] font-mono text-gray-500">
                  {article.date}
                </time>
                <Link
                  href={`/resources/${article.slug}`}
                  className="text-xs font-bold text-servora-core hover:underline inline-flex items-center gap-1"
                >
                  Read Article &rarr;
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl bg-white border border-gray-200 p-10 text-center">
          <h3 className="text-base font-bold text-servora-navy">
            No matching hospitality guides found
          </h3>
          <p className="mt-2 text-xs sm:text-sm text-servora-deepTeal">
            Try clearing your search term or switching back to all resource categories.
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-5 inline-flex h-10 items-center justify-center rounded-xl bg-servora-core px-5 text-xs font-bold text-white hover:bg-blue-700 transition-colors cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      )}
    </div>
  );
}