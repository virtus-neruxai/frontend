import { useState, useCallback, useEffect } from 'react';
import { projectsApi } from '../../lib/api';
import { toast } from 'sonner';

/**
 * Projects (Modo plan) viewmodel. Each project comes from the backend with its
 * children (tasks/routines) and aggregate metrics already computed — see
 * backend/routes/projects.py::_project_with_children.
 */
export const useProjects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await projectsApi.getAll();
      setProjects(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(err);
      toast.error('No se pudieron cargar tus proyectos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const completeProject = useCallback(async (projectId) => {
    setBusyId(projectId);
    try {
      await projectsApi.complete(projectId);
      toast.success('Proyecto marcado como finalizado');
      await fetchProjects();
    } catch (err) {
      toast.error('No se pudo finalizar el proyecto');
      throw err;
    } finally {
      setBusyId(null);
    }
  }, [fetchProjects]);

  const deleteProject = useCallback(async (projectId) => {
    setBusyId(projectId);
    try {
      await projectsApi.remove(projectId);
      toast.info('Proyecto eliminado');
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
    } catch (err) {
      toast.error('No se pudo eliminar el proyecto');
      throw err;
    } finally {
      setBusyId(null);
    }
  }, []);

  return { projects, loading, error, busyId, fetchProjects, completeProject, deleteProject };
};
