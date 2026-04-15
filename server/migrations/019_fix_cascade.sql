-- ================================================================
-- Troca ON DELETE CASCADE → ON DELETE RESTRICT nas FKs de company_id.
-- Isso garante que deletar uma empresa NUNCA apague clientes, vendedores,
-- status ou catálogos silenciosamente.
-- ================================================================

-- clients
ALTER TABLE clients
  DROP CONSTRAINT IF EXISTS clients_company_id_fkey,
  ADD  CONSTRAINT clients_company_id_fkey
       FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT;

-- sellers
ALTER TABLE sellers
  DROP CONSTRAINT IF EXISTS sellers_company_id_fkey,
  ADD  CONSTRAINT sellers_company_id_fkey
       FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT;

-- status
ALTER TABLE status
  DROP CONSTRAINT IF EXISTS status_company_id_fkey,
  ADD  CONSTRAINT status_company_id_fkey
       FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT;

-- catalogs
ALTER TABLE catalogs
  DROP CONSTRAINT IF EXISTS catalogs_company_id_fkey,
  ADD  CONSTRAINT catalogs_company_id_fkey
       FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT;
