import { useEffect, useRef, useState } from 'react';

import { fetchLinkTitle } from '@/lib/linkMetadata';

const DEBOUNCE_MS = 800;

/**
 * Подтягивает название по ссылке и подставляет его, пока поле названия пустое.
 * Как только пользователь начал править название сам, автоподстановка молчит:
 * ручной ввод всегда важнее догадки сайта.
 */
export function useLinkTitle({
  url,
  title,
  onTitleResolved,
}: {
  url: string;
  title: string;
  onTitleResolved: (title: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const requestedUrlRef = useRef<string | null>(null);
  const titleRef = useRef(title);

  // Свежее название держим в ref, но пишем его в эффекте: менять ref во время
  // рендера нельзя, иначе рендер перестаёт быть чистой функцией.
  useEffect(() => {
    titleRef.current = title;
  }, [title]);

  useEffect(() => {
    const trimmed = url.trim();

    if (!/^https?:\/\/\S+$/i.test(trimmed) || requestedUrlRef.current === trimmed) {
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      requestedUrlRef.current = trimmed;
      setLoading(true);

      void fetchLinkTitle(trimmed)
        .then((resolved) => {
          // Пока ходили в сеть, пользователь мог ввести название сам.
          if (cancelled || !resolved || titleRef.current.trim()) return;
          onTitleResolved(resolved);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [url, onTitleResolved]);

  return { loading };
}
