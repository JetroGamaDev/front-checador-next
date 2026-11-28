import { getConfigSystem } from "@/app/actions/configSystem-actions";
import { fetchPermissionsById } from "@/app/actions/permissions-actions";
import Loading from "@/components/LoadingSpinner";
import ShowInfoPermissionRequest from "@/components/Permissions/PermissionOne";
import { Suspense } from "react";


export default async function PermissionInfoOne({id}:{id:string}){

   const [permission, configSystem] = await Promise.all([
      fetchPermissionsById({ id }),
      getConfigSystem(),
   ]);

   // Personas de Dirección: firman la casilla "Líder" cuando quien solicita es un líder
   const directionIds = (configSystem[0]?.permissions?.extra?.ids ?? []).map(Number);

    return <>
        <Suspense fallback={<Loading message="Cargando..." />}>
            <ShowInfoPermissionRequest permission={permission} id={id} directionIds={directionIds} />
        </Suspense>
    </>
}
