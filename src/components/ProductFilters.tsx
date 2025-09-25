// src/components/ProductFilters.tsx
'use client'

import { useState, useEffect } from "react";

export default function ProductFilters({
  onChangeFilters,
}: {
  onChangeFilters: (filters: any) => void;
}) {
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(75000);
  const [inStock, setInStock] = useState(false);

  const handlePriceChange = () => {
    onChangeFilters({ minPrice, maxPrice, inStock });
  };

  return (
    <div>
      <h3>Filtros</h3>
      <input
        type="range"
        min={0}
        max={75000}
        value={minPrice}
        onChange={(e) => setMinPrice(Number(e.target.value))}
        onBlur={handlePriceChange}
      />
      <input
        type="range"
        min={0}
        max={75000}
        value={maxPrice}
        onChange={(e) => setMaxPrice(Number(e.target.value))}
        onBlur={handlePriceChange}
      />
      <label>
        En existencia
        <input
          type="checkbox"
          checked={inStock}
          onChange={() => setInStock((prev) => !prev)}
          onBlur={handlePriceChange}
        />
      </label>
    </div>
  );
}
