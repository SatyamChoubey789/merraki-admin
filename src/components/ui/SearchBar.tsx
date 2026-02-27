"use client";
import { InputAdornment, TextField } from "@mui/material";
import { SearchRounded } from "@mui/icons-material";
import { useDebounce } from "@/hooks/useDebounce";
import { useEffect, useState } from "react";

interface Props {
  placeholder?: string;
  onSearch: (value: string) => void;
  debounce?: number;
}

export default function SearchBar({ placeholder = "Search...", onSearch, debounce = 400 }: Props) {
  const [value, setValue] = useState("");
  const debouncedValue = useDebounce(value, debounce);

  useEffect(() => { onSearch(debouncedValue); }, [debouncedValue, onSearch]);

  return (
    <TextField
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder={placeholder}
      size="small"
      sx={{ width: 280, "& .MuiOutlinedInput-root": { borderRadius: 3 } }}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchRounded sx={{ fontSize: 18, color: "text.disabled" }} />
          </InputAdornment>
        ),
      }}
    />
  );
}