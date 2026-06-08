import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useDebounce } from './useDebounce';

export function usePageEditor({ id, saveFn }) {
  const [pagesData, setPagesData] = useState([]);
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
    setPagesData(prev => {
      const updated = JSON.parse(JSON.stringify(prev));
      if (updated[index]) {
        setNestedValue(updated[index], field, value);
        if (broadcast) broadcast({ index, field, value });
      }
      return updated;
    });
  }, []);

  const handleRemoteUpdate = useCallback((payload) => {
    const { index, field, value } = payload;
    isLocalUpdateRef.current = false;
    setPagesData(prev => {
      const updated = JSON.parse(JSON.stringify(prev));
      if (updated[index]) {
        setNestedValue(updated[index], field, value);
      }
      return updated;
    });
  }, []);

  const updatePageSlice = useCallback((pageIndex, sliceIndex, subfield, value) => {
    updatePage(pageIndex, `slices[${sliceIndex}].${subfield}`, value);
  }, [updatePage]);

  const addSlice = useCallback((pageIndex) => {
    isLocalUpdateRef.current = true;
    setPagesData(prev => {
      const updated = [...prev];
      const currentSlices = updated[pageIndex]?.slices || [];
      currentSlices.push({ id: crypto.randomUUID(), label: 'NUEVO SECTOR', stat: '0.00%', percentage: 10, color: '#4a8df8' });
      updated[pageIndex] = { ...updated[pageIndex], slices: currentSlices };
      return updated;
    });
  }, []);

  const addPage = useCallback((type) => {
    let defaultData = {};
    if (type === 'CARATULA') {
      defaultData = { titulo: 'INFORME TÉCNICO', subtitulo: '' };
    } else if (type === 'UBICACION') {
      defaultData = { lat: -34.6037, lng: -58.3816, zoom: 12 };
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
    setPagesData(prev => {
      if (prev.length <= 1) return prev;
      isLocalUpdateRef.current = true;
      const newArray = [...prev];
      newArray.splice(index, 1);
      if (activePageIndex >= newArray.length) setActivePageIndex(newArray.length - 1);
      return newArray;
    });
  }, [activePageIndex]);

  const movePage = useCallback((index, direction) => {
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
  }, []);

  const uploadImage = useCallback(async (e, pageIndex, field) => {
    const file = e.target.files[0];
    if (!file) return;

    setSaveStatus('saving');
    try {
      const bucketName = 'assets';
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', bucketName);
      formData.append('folder', `${id}/${pageIndex}`);

      const { data, error } = await supabase.functions.invoke('upload-image', {
        body: formData,
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Error en Edge Function');

      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(data.web.path);

      updatePage(pageIndex, field, publicUrl);
      setSaveStatus('saved');
    } catch (error) {
      console.error('Error uploading image:', error);
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
    activePageIndex, setActivePageIndex,
    activeBlockIndex, setActiveBlockIndex,
    isEditingMap, setIsEditingMap,
    isEditingPage, setIsEditingPage,
    saveStatus, setSaveStatus,
    showPageSelector, setShowPageSelector,
    selectionFormat,
    debouncedPagesData, isLocalUpdateRef, isFirstLoad,
    currentLockedFieldRef,
    addPage, removePage, movePage,
    updatePage, handleRemoteUpdate,
    updatePageSlice, addSlice,
    setNestedValue, uploadImage,
    handlePageClick,
  };
}
