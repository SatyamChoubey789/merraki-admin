"use client";
import { useState } from "react";
import {
  Box,
  Button,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  Paper,
  Tabs,
  Tab,
  Chip,
} from "@mui/material";
import {
  AddRounded,
  EditRounded,
  DeleteRounded,
  DownloadRounded,
} from "@mui/icons-material";
import { Grid } from "@mui/material";
import useSWR from "swr";
import { useSnackbar } from "notistack";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import dayjs from "dayjs";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import PageWrapper from "@/components/layout/PageWrapper";
import DataTable, { Column } from "@/components/ui/DataTable";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import api from "@/lib/axios";
import { TestQuestion, TestSubmission } from "@/types";
import { alpha } from "@mui/material";

const GOLD = "#C9A84C";
const PIE_COLORS = [GOLD, "#4CAF82", "#E05C5C", "#4A8FD4", "#6B8CAE"];

export default function TestsPage() {
  const { enqueueSnackbar } = useSnackbar();
  const [tab, setTab] = useState(0);
  const [page, setPage] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editQ, setEditQ] = useState<TestQuestion | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  const { data: submissionsData, isLoading } = useSWR(
    `/admin/test/submissions?page=${page + 1}&limit=25`,
  );
  const { data: analyticsData } = useSWR(
    tab === 2 ? "/admin/test/analytics" : null,
  );
  const { data: questionsData, mutate: mutateQ } = useSWR(
    tab === 1 ? "/admin/test/questions" : null,
  );

  const submissions: TestSubmission[] = submissionsData?.data ?? [];
  const questions: TestQuestion[] = questionsData?.data ?? [];

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<TestQuestion>({
    defaultValues: {
      options: ["", ""],
      questionType: "multiple-choice",
      weight: 1,
      orderNumber: 1,
      category: "",
    },
  });

  const {
    fields: optFields,
    append,
    remove,
  } = useFieldArray({ control, name: "options" as never });

  const openCreate = () => {
    reset({
      options: ["", ""],
      questionType: "multiple-choice",
      weight: 1,
      orderNumber: 1,
    });
    setEditQ(null);
    setFormOpen(true);
  };
  const openEdit = (q: TestQuestion) => {
    reset(q);
    setEditQ(q);
    setFormOpen(true);
  };

  const onSubmit = async (data: TestQuestion) => {
    setSubmitLoading(true);
    try {
      if (editQ) {
        await api.put(`/admin/test/questions/${editQ.id}`, data);
        enqueueSnackbar("Question updated", { variant: "success" });
      } else {
        await api.post("/admin/test/questions", data);
        enqueueSnackbar("Question created", { variant: "success" });
      }
      mutateQ();
      setFormOpen(false);
    } catch {
      enqueueSnackbar("Save failed", { variant: "error" });
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/admin/test/questions/${deleteId}`);
      enqueueSnackbar("Question deleted", { variant: "success" });
      mutateQ();
    } catch {
      enqueueSnackbar("Delete failed", { variant: "error" });
    } finally {
      setDeleteLoading(false);
      setDeleteId(null);
    }
  };

  const handleExport = async () => {
    try {
      const res = await api.get("/admin/test/export", {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `test-data-${dayjs().format("YYYY-MM-DD")}.csv`;
      a.click();
      enqueueSnackbar("Export started", { variant: "success" });
    } catch {
      enqueueSnackbar("Export failed", { variant: "error" });
    }
  };

  const submissionColumns: Column<TestSubmission>[] = [
    {
      key: "userName",
      label: "Name",
      render: (row) => (
        <Typography sx={{ fontWeight: 500, fontSize: "0.875rem" }}>
          {row.userName}
        </Typography>
      ),
    },
    {
      key: "userEmail",
      label: "Email",
      render: (row) => (
        <Typography sx={{ fontSize: "0.82rem", color: "text.secondary" }}>
          {row.userEmail}
        </Typography>
      ),
    },
    {
      key: "score",
      label: "Score",
      render: (row) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box
            sx={{
              width: 60,
              height: 4,
              borderRadius: 2,
              background: "rgba(255,255,255,0.1)",
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                width: `${(row.score / 100) * 100}%`,
                height: "100%",
                background:
                  row.score > 70
                    ? "#4CAF82"
                    : row.score > 40
                      ? GOLD
                      : "#E05C5C",
                borderRadius: 2,
              }}
            />
          </Box>
          <Typography
            sx={{
              fontSize: "0.82rem",
              fontWeight: 600,
              color:
                row.score > 70 ? "#4CAF82" : row.score > 40 ? GOLD : "#E05C5C",
            }}
          >
            {row.score}%
          </Typography>
        </Box>
      ),
    },
    {
      key: "completedAt",
      label: "Completed",
      render: (row) => (
        <Typography sx={{ fontSize: "0.82rem", color: "text.secondary" }}>
          {dayjs(row.completedAt).format("MMM D, YYYY HH:mm")}
        </Typography>
      ),
    },
  ];

  return (
    <PageWrapper
      title="Test & Assessment"
      subtitle="Manage questions, view submissions"
      actions={
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<DownloadRounded />}
            onClick={handleExport}
            size="small"
          >
            Export
          </Button>
          {tab === 1 && (
            <Button
              variant="contained"
              startIcon={<AddRounded />}
              onClick={openCreate}
              size="small"
            >
              Add Question
            </Button>
          )}
        </Box>
      }
    >
      <Paper sx={{ borderRadius: 3, mb: 3 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ px: 2, borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <Tab label="Submissions" />
          <Tab label="Questions" />
          <Tab label="Analytics" />
        </Tabs>
      </Paper>

      {tab === 0 && (
        <DataTable
          columns={submissionColumns}
          rows={submissions}
          loading={isLoading}
          page={page}
          rowsPerPage={25}
          total={submissionsData?.pagination?.total ?? 0}
          onPageChange={setPage}
          getRowId={(r) => r.id}
        />
      )}

      {tab === 1 && (
        <DataTable
          columns={[
            {
              key: "orderNumber",
              label: "#",
              render: (row) => (
                <Typography sx={{ fontWeight: 600, color: GOLD }}>
                  {row.orderNumber}
                </Typography>
              ),
            },
            {
              key: "questionText",
              label: "Question",
              render: (row) => (
                <Typography sx={{ fontSize: "0.875rem" }}>
                  {row.questionText}
                </Typography>
              ),
            },
            {
              key: "questionType",
              label: "Type",
              render: (row) => (
                <Chip
                  label={row.questionType}
                  size="small"
                  sx={{
                    background: alpha(GOLD, 0.12),
                    color: GOLD,
                    fontSize: "0.7rem",
                  }}
                />
              ),
            },
            { key: "category", label: "Category" },
            {
              key: "weight",
              label: "Weight",
              render: (row) => (
                <Typography sx={{ fontWeight: 600 }}>{row.weight}</Typography>
              ),
            },
            {
              key: "actions",
              label: "",
              align: "right",
              render: (row) => (
                <Box sx={{ display: "flex", gap: 0.5 }}>
                  <Tooltip title="Edit">
                    <IconButton size="small" onClick={() => openEdit(row)}>
                      <EditRounded sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton
                      size="small"
                      onClick={() => setDeleteId(row.id)}
                      sx={{ "&:hover": { color: "#E05C5C" } }}
                    >
                      <DeleteRounded sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              ),
            },
          ]}
          rows={questions}
          loading={!questionsData}
          getRowId={(r) => r.id}
        />
      )}

      {tab === 2 && (
        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, fontSize: "1rem" }}>
                Score Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={analyticsData?.data?.distribution ?? []}
                    dataKey="count"
                    nameKey="range"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    paddingAngle={3}
                  >
                    {(analyticsData?.data?.distribution ?? []).map(
                      (_: unknown, i: number) => (
                        <Cell
                          key={i}
                          fill={PIE_COLORS[i % PIE_COLORS.length]}
                          stroke="none"
                        />
                      ),
                    )}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, fontSize: "1rem" }}>
                Category Performance
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <RadarChart
                  data={analyticsData?.data?.categoryPerformance ?? []}
                >
                  <PolarGrid stroke="rgba(255,255,255,0.08)" />
                  <PolarAngleAxis
                    dataKey="category"
                    tick={{ fill: "rgba(240,237,232,0.5)", fontSize: 11 }}
                  />
                  <Radar
                    dataKey="avgScore"
                    stroke={GOLD}
                    fill={GOLD}
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Question Form Dialog */}
      <Dialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{editQ ? "Edit Question" : "Add Question"}</DialogTitle>
        <DialogContent>
          <Box
            component="form"
            id="q-form"
            onSubmit={handleSubmit(onSubmit)}
            sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}
          >
            <TextField
              {...register("questionText", { required: "Required" })}
              label="Question Text"
              fullWidth
              multiline
              rows={2}
              error={!!errors.questionText}
              helperText={errors.questionText?.message}
            />
            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Type</InputLabel>
                  <Controller
                    name="questionType"
                    control={control}
                    render={({ field }) => (
                      <Select {...field} label="Type">
                        <MenuItem value="single">Single Choice</MenuItem>
                        <MenuItem value="multiple">Multiple Choice</MenuItem>
                        <MenuItem value="scale">Scale</MenuItem>
                        <MenuItem value="text">Text</MenuItem>
                      </Select>
                    )}
                  />
                </FormControl>
              </Grid>
              <Grid size={{ xs: 3 }}>
                <TextField
                  {...register("weight", { valueAsNumber: true })}
                  label="Weight"
                  type="number"
                  fullWidth
                  inputProps={{ min: 1, max: 10 }}
                />
              </Grid>
              <Grid size={{ xs: 3 }}>
                <TextField
                  {...register("orderNumber", { valueAsNumber: true })}
                  label="Order"
                  type="number"
                  fullWidth
                  inputProps={{ min: 1 }}
                />
              </Grid>
            </Grid>
            <TextField
              {...register("category")}
              label="Category"
              fullWidth
              placeholder="e.g. Personality, Skills"
            />
            <Box>
              <Typography
                sx={{ fontSize: "0.8rem", color: "text.secondary", mb: 1 }}
              >
                Options
              </Typography>
              {optFields.map((field, i) => (
                <Box key={field.id} sx={{ display: "flex", gap: 1, mb: 1 }}>
                  <TextField
                    {...register(`options.${i}` as const)}
                    label={`Option ${i + 1}`}
                    fullWidth
                    size="small"
                  />
                  {optFields.length > 2 && (
                    <IconButton
                      size="small"
                      onClick={() => remove(i)}
                      sx={{ color: "#E05C5C" }}
                    >
                      <DeleteRounded sx={{ fontSize: 16 }} />
                    </IconButton>
                  )}
                </Box>
              ))}
              <Button
                size="small"
                variant="outlined"
                onClick={() => append("")}
                sx={{ mt: 0.5, borderRadius: 2, fontSize: "0.78rem" }}
              >
                + Add Option
              </Button>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setFormOpen(false)}
            variant="outlined"
            size="small"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="q-form"
            variant="contained"
            size="small"
            disabled={submitLoading}
          >
            {submitLoading ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Question"
        message="Delete this question permanently?"
        loading={deleteLoading}
        onConfirm={handleDelete}
        onClose={() => setDeleteId(null)}
      />
    </PageWrapper>
  );
}
