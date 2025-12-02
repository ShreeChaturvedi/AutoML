import { listDatasets } from '@/lib/api/datasets';
import { useDataStore } from '@/stores/dataStore';
import { getFileType } from '@/types/file';

let hydrated = false;

export async function hydrateDatasetsFromBackend() {
  if (hydrated) return;
  hydrated = true;

  try {
    const { datasets } = await listDatasets();
    const addFile = useDataStore.getState().addFile;
    const addPreview = useDataStore.getState().addPreview;

    for (const dataset of datasets) {
      const existing = useDataStore
        .getState()
        .files.find((file) => file.metadata?.datasetId === dataset.datasetId);
      if (existing) continue;

      // Use an empty File as a placeholder so CSV parsing logic
      // can skip it (size === 0) while previews still work.
      const placeholderFile = new File([], dataset.filename);

      addFile({
        id: dataset.datasetId,
        name: dataset.filename,
        type: getFileType(placeholderFile),
        size: dataset.size,
        uploadedAt: new Date(dataset.createdAt),
        projectId: dataset.projectId ?? '00000000-0000-0000-0000-000000000000',
        file: placeholderFile,
        metadata: {
          datasetId: dataset.datasetId,
          rowCount: dataset.nRows,
          columnCount: dataset.nCols,
          columns: dataset.columns.map((col) => col.name)
        }
      });

      addPreview({
        fileId: dataset.datasetId,
        headers: dataset.columns.map((col) => col.name),
        rows: dataset.sample ?? [],
        totalRows: dataset.nRows,
        previewRows: Math.min(dataset.sample?.length ?? 0, 50)
      });
    }
  } catch (error) {
    console.error('[frontend] failed to hydrate datasets from backend', error);
  }
}

