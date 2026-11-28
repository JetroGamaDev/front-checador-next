import { getConfigSystem } from "@/app/actions/configSystem-actions";
import { findVacationById } from "@/app/actions/vacations-actions";
import Loading from "@/components/LoadingSpinner";
import ShowInfoVacation from "@/components/vacations/VacationOne";
import { Suspense } from "react";


export default async function VacationsInfoOne({id}:{id:string}){

   const [vacation, configSystem] = await Promise.all([
      findVacationById({ id }),
      getConfigSystem(),
   ]);

   // Personas de Dirección (las mismas que usa el alta de vacaciones): firman la casilla "Líder" cuando quien solicita es un líder
   const directionIds = (configSystem[0]?.permissions?.extra?.ids ?? []).map(Number);

    return <>
        <Suspense fallback={<Loading message="Cargando..." />}>
            <ShowInfoVacation vacation={vacation} directionIds={directionIds}/>
        </Suspense>
    </>
}
