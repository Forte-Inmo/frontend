import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useDebounce } from './useDebounce';
import { useHistory } from './useHistory';

export function usePageEditor({ id, saveFn }) {
  const { state: pagesData, setState: setPagesData, reset: resetPagesData, record: recordMutation, undo, redo, canUndo, canRedo } = useHistory([]);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [activeBlockIndex, setActiveBlockIndex] = useState(null);
  const [isEditingMap, setIsEditingMap] = useState(false);
  const [isEditingPage, setIsEditingPage] = useState(false);
  const [saveStatus, setSaveStatus] = useState('saved');
  const [showPageSelector, setShowPageSelector] = useState(false);
  const [selectionFormat, setSelectionFormat] = useState({ bold: false, italic: false, list: false });

  const isLocalUpdateRef = useRef(false);
  const isFirstLoad = useRef(true);
  const currentLockedFieldRef = useRef(null);

  const debouncedPagesData = useDebounce(pagesData, 2000);

  useEffect(() => {
    const handleSelectionChange = () => {
      setSelectionFormat({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        list: document.queryCommandState('insertUnorderedList') || document.queryCommandState('insertOrderedList')
      });
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  useEffect(() => {
    if (!isFirstLoad.current && debouncedPagesData.length > 0) {
      saveFn(debouncedPagesData, setSaveStatus);
    }
  }, [debouncedPagesData, saveFn]);

  useEffect(() => {
    setActivePageIndex(prev => {
      if (prev >= pagesData.length) return Math.max(0, pagesData.length - 1);
      return prev;
    });
  }, [pagesData.length]);

  useEffect(() => {
    const isMac = navigator.platform.includes('Mac');
    const handleKeyDown = (e) => {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;

      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (!mod) return;

      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.key === 'z' && e.shiftKey) || e.key === 'Z') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const setNestedValue = (obj, path, value) => {
    if (path.includes('[') || path.includes('.')) {
      const parts = path.replace(/\]/g, '').split(/[.[]/);
      let target = obj;
      for (let i = 0; i < parts.length - 1; i++) {
        if (parts[i] !== "") {
          if (!target[parts[i]]) target[parts[i]] = {};
          target = target[parts[i]];
        }
      }
      target[parts[parts.length - 1]] = value;
    } else {
      obj[path] = value;
    }
  };

  const updatePage = useCallback((index, field, value, broadcast) => {
    isLocalUpdateRef.current = true;
    recordMutation();
    setPagesData(prev => {
      const updated = JSON.parse(JSON.stringify(prev));
      if (updated[index]) {
        setNestedValue(updated[index], field, value);
        if (broadcast) broadcast({ index, field, value });
      }
      return updated;
    });
  }, [recordMutation]);

  const handleRemoteUpdate = useCallback((payload) => {
    const { index, field, value } = payload;
    isLocalUpdateRef.current = false;
    recordMutation();
    setPagesData(prev => {
      const updated = JSON.parse(JSON.stringify(prev));
      if (updated[index]) {
        setNestedValue(updated[index], field, value);
      }
      return updated;
    });
  }, [recordMutation]);

  const updatePageSlice = useCallback((pageIndex, sliceIndex, subfield, value) => {
    updatePage(pageIndex, `slices[${sliceIndex}].${subfield}`, value);
  }, [updatePage]);

  const addSlice = useCallback((pageIndex) => {
    isLocalUpdateRef.current = true;
    recordMutation();
    setPagesData(prev => {
      const updated = [...prev];
      const currentSlices = updated[pageIndex]?.slices || [];
      currentSlices.push({ id: crypto.randomUUID(), label: 'NUEVO SECTOR', stat: '0.00%', percentage: 10, color: '#4a8df8' });
      updated[pageIndex] = { ...updated[pageIndex], slices: currentSlices };
      return updated;
    });
  }, [recordMutation]);

  const addPage = useCallback((type, campo) => {
    let defaultData = {};
    if (type === 'CARATULA') {
      defaultData = {
        titulo: campo?.operacion === 'alquiler' ? 'CAMPO EN ALQUILER' : 'CAMPO EN VENTA',
        subtitulo: ''
      };
    } else if (type === 'UBICACION') {
      defaultData = {
        lat: -34.6037, lng: -58.3816, zoom: 12,
        blocks: [
          { id: crypto.randomUUID(), type: 'title', title: 'UBICACIÓN Y DISTRIBUCIÓN', yOffset: 0, textColor: '#ffffff', titleSize: 'md', bgColor: '#107549', variant: 'standard', width: 'full', align: 'left' },
          { id: crypto.randomUUID(), type: 'text', text: 'Establecimiento agropecuario de 5000 hectáreas. Ubicado en el departamento Conhelo, Provincia de La Pampa.', xOffset: 15, yOffset: 80, textColor: '#ffffff', textSize: 'md', bgColor: '#107549', variant: 'standard', width: 'half', align: 'left' },
        ]
      };
    } else if (type === 'DINAMICA') {
      defaultData = {
        fondo_url: '',
        blocks: [
          { id: crypto.randomUUID(), type: 'text', content: 'Nuevo bloque de texto...', x: 10, y: 10, w: 30, h: 20, color: '#064e3b' }
        ]
      };
    } else if (type === 'ANALISIS_SUELO') {
      defaultData = {
        slices: [
          { id: crypto.randomUUID(), label: 'BOSQUE DE CALDÉN', stat: '45.20%', percentage: 45, color: '#107549' },
          { id: crypto.randomUUID(), label: 'PASTIZAL NATURAL', stat: '34.80%', percentage: 35, color: '#fbbf24' },
          { id: crypto.randomUUID(), label: 'OTROS USOS', stat: '20.00%', percentage: 20, color: '#4a8df8' },
        ],
        tableData: [
          { calc: '40% - 60%', desc: 'BOSQUE DE CALDÉN' },
          { calc: '20% - 30%', desc: 'BOSQUE DE CALDÉN ALTO' },
        ]
      };
    } else {
      defaultData = { texto_izquierdo: 'Escribe aquí...', fotos: [] };
    }

    recordMutation();
    setPagesData(prev => {
      const newPage = { id: crypto.randomUUID(), type, ...defaultData };
      const newPages = [...prev, newPage];
      const newIndex = newPages.length - 1;
      setActivePageIndex(newIndex);
      setShowPageSelector(false);
      if (type === 'UBICACION') setIsEditingMap(true);
      else setIsEditingMap(false);
      setActiveBlockIndex(null);
      setTimeout(() => {
        document.getElementById(`page-${newIndex}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      return newPages;
    });
  }, []);

  const removePage = useCallback((index) => {
    if (pagesData.length <= 1) return;
    recordMutation();
    setPagesData(prev => {
      if (prev.length <= 1) return prev;
      isLocalUpdateRef.current = true;
      const newArray = [...prev];
      newArray.splice(index, 1);
      if (activePageIndex >= newArray.length) setActivePageIndex(newArray.length - 1);
      return newArray;
    });
  }, [activePageIndex, pagesData.length, recordMutation]);

  const duplicatePage = useCallback((index) => {
    recordMutation();
    setPagesData(prev => {
      const source = prev[index];
      if (!source) return prev;
      const cloned = JSON.parse(JSON.stringify(source));
      cloned.id = crypto.randomUUID();
      const newArray = [...prev];
      newArray.splice(index + 1, 0, cloned);
      setActivePageIndex(index + 1);
      isLocalUpdateRef.current = true;
      setTimeout(() => {
        document.getElementById(`page-${index + 1}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      return newArray;
    });
  }, [recordMutation]);

  const movePage = useCallback((index, direction) => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === pagesData.length - 1)) return;
    recordMutation();
    setPagesData(prev => {
      if (direction === 'up' && index === 0) return prev;
      if (direction === 'down' && index === prev.length - 1) return prev;

      isLocalUpdateRef.current = true;
      const newArray = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      const [movedPage] = newArray.splice(index, 1);
      newArray.splice(targetIndex, 0, movedPage);
      setActivePageIndex(targetIndex);
      setTimeout(() => {
        document.getElementById(`page-${targetIndex}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      return newArray;
    });
  }, [pagesData.length, recordMutation]);

  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/tiff', 'image/bmp'];
  const MAX_IMAGE_SIZE = 100 * 1024 * 1024;

  const sanitizeName = (filename) =>
    filename.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9-_]/g, '_').toLowerCase().slice(0, 60);

  const canvasToBlob = (canvas, type, quality) =>
    new Promise((resolve) => canvas.toBlob(resolve, type, quality));

  const prepareImage = (file, maxDimension = 2560, webQuality = 0.82) => {
    console.log('[upload] prepareImage start', { name: file.name, size: file.size, type: file.type });
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = async () => {
        try {
          let { width, height } = img;
          console.log('[upload] image loaded', { width, height });
          const needsResize = width > maxDimension || height > maxDimension;
          if (needsResize) {
            const ratio = maxDimension / Math.max(width, height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
            console.log('[upload] resizing to', { width, height, ratio });
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          let original = file;
          if (needsResize) {
            const resizedBlob = await canvasToBlob(canvas, file.type, 0.85);
            if (resizedBlob) {
              original = new File([resizedBlob], file.name, { type: file.type });
              console.log('[upload] resize done', { originalSize: file.size, newSize: original.size });
            } else {
              console.warn('[upload] toBlob returned null, keeping original file');
            }
          }

          const webBlob = await canvasToBlob(canvas, 'image/webp', webQuality);
          const web = webBlob && webBlob.type === 'image/webp' ? webBlob : null;
          console.log('[upload] web version', { hasWeb: !!web, webSize: web?.size ?? null });

          URL.revokeObjectURL(url);
          resolve({ original, web });
        } catch (err) {
          console.error('[upload] prepare error', err);
          URL.revokeObjectURL(url);
          resolve({ original: file, web: null });
        }
      };
      img.onerror = (err) => {
        console.error('[upload] image load error', err);
        URL.revokeObjectURL(url);
        resolve({ original: file, web: null });
      };
      img.src = url;
    });
  };

  const uploadImage = useCallback(async (e, pageIndex, field) => {
    const file = e.target.files[0];
    if (!file) {
      console.warn('[upload] no file selected');
      return;
    }
    console.log('[upload] starting upload', { name: file.name, size: file.size, type: file.type, pageIndex, field });

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      console.error('[upload] tipo de archivo no permitido:', file.type);
      setSaveStatus('error');
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      console.error('[upload] archivo supera el limite de 100MB');
      setSaveStatus('error');
      return;
    }

    setSaveStatus('saving');
    try {
      const { original, web } = await prepareImage(file);
      console.log('[upload] image prepared', {
        originalSize: original.size,
        webSize: web?.size ?? null,
        hasWeb: !!web,
      });

      const bucketName = 'assets';
      const uuid = crypto.randomUUID();
      const baseName = sanitizeName(file.name);
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
      const prefix = `${id}/${pageIndex}`;
      const originalPath = `${prefix}/originals/${baseName}_${uuid}.${ext}`;
      const webPath = `${prefix}/web/${baseName}_${uuid}.webp`;

      const [origResult, webResult] = await Promise.all([
        supabase.storage.from(bucketName).upload(originalPath, original, {
          contentType: file.type,
          upsert: false,
        }),
        web
          ? supabase.storage.from(bucketName).upload(webPath, web, {
              contentType: 'image/webp',
              upsert: false,
            })
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (origResult.error) throw new Error(`Error subiendo original: ${origResult.error.message}`);
      if (web && webResult.error) {
        console.warn('[upload] fallo el upload web, se usara el original', webResult.error);
      }

      const chosenPath = web && !webResult.error ? webPath : originalPath;
      const { data: { publicUrl } } = supabase.storage.from(bucketName).getPublicUrl(chosenPath);
      console.log('[upload] public URL obtained', { publicUrl, path: chosenPath });

      updatePage(pageIndex, field, publicUrl);
      setSaveStatus('saved');
      console.log('[upload] upload complete');
    } catch (error) {
      console.error('[upload] upload error:', error);
      setSaveStatus('error');
    }
  }, [id, updatePage]);

  const handlePageClick = useCallback((index) => {
    setActivePageIndex(index);
    setIsEditingPage(true);
    setActiveBlockIndex(null);
    setIsEditingMap(false);
    document.getElementById(`page-${index}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  return {
    pagesData, setPagesData,
    resetPagesData,
    activePageIndex, setActivePageIndex,
    activeBlockIndex, setActiveBlockIndex,
    isEditingMap, setIsEditingMap,
    isEditingPage, setIsEditingPage,
    saveStatus, setSaveStatus,
    showPageSelector, setShowPageSelector,
    selectionFormat,
    debouncedPagesData, isLocalUpdateRef, isFirstLoad,
    currentLockedFieldRef,
    addPage, duplicatePage, removePage, movePage,
    updatePage, handleRemoteUpdate,
    updatePageSlice, addSlice,
    setNestedValue, uploadImage,
    handlePageClick,
    undo, redo, canUndo, canRedo,
  };
}
