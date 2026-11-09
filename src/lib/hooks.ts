import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Category, Business, Product, Service, Job, EmergencyContact } from '@/types/db';

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase
      .from('categories')
      .select('*')
      .order('sort_order')
      .then(({ data }) => {
        setCategories((data as Category[]) || []);
        setLoading(false);
      });
  }, []);
  return { categories, loading };
}

export function useBusinesses(filter?: { categorySlug?: string; featured?: boolean; search?: string }) {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let query = supabase
      .from('businesses')
      .select('*, category:categories(*)')
      .eq('status', 'approved')
      .order('is_featured', { ascending: false })
      .order('score', { ascending: false });

    if (filter?.featured) query = query.eq('is_featured', true);
    if (filter?.search) query = query.ilike('name', `%${filter.search}%`);

    query.then(({ data }) => {
      let result = (data as Business[]) || [];
      if (filter?.categorySlug) {
        result = result.filter((b) => b.category?.slug === filter.categorySlug);
      }
      setBusinesses(result);
      setLoading(false);
    });
  }, [filter?.categorySlug, filter?.featured, filter?.search]);

  return { businesses, loading };
}

export function useProducts(filter?: { flash?: boolean; businessId?: string; categorySlug?: string; search?: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let query = supabase
      .from('products')
      .select('*, business:businesses(*), category:categories(*)')
      .order('created_at', { ascending: false });

    if (filter?.flash) query = query.eq('is_flash_offer', true);
    if (filter?.businessId) query = query.eq('business_id', filter.businessId);
    if (filter?.search) query = query.ilike('name', `%${filter.search}%`);

    query.then(({ data }) => {
      let result = (data as Product[]) || [];
      if (filter?.categorySlug) {
        result = result.filter((p) => p.category?.slug === filter.categorySlug || p.business?.category?.slug === filter.categorySlug);
      }
      setProducts(result);
      setLoading(false);
    });
  }, [filter?.flash, filter?.businessId, filter?.categorySlug, filter?.search]);

  return { products, loading };
}

export function useServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase
      .from('services')
      .select('*, business:businesses(*)')
      .order('score', { ascending: false })
      .then(({ data }) => {
        setServices((data as Service[]) || []);
        setLoading(false);
      });
  }, []);
  return { services, loading };
}

export function useJobs(openOnly = true) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let query = supabase
      .from('jobs')
      .select('*, business:businesses(*)')
      .order('created_at', { ascending: false });
    if (openOnly) query = query.eq('is_open', true);
    query.then(({ data }) => {
      setJobs((data as Job[]) || []);
      setLoading(false);
    });
  }, [openOnly]);
  return { jobs, loading };
}

export function useEmergencies() {
  const [emergencies, setEmergencies] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase
      .from('emergency_contacts')
      .select('*')
      .order('sort_order')
      .then(({ data }) => {
        setEmergencies((data as EmergencyContact[]) || []);
        setLoading(false);
      });
  }, []);
  return { emergencies, loading };
}
