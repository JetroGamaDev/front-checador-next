import { getWaiverContent, ListOneDevice } from "@/app/actions/devices-actions";
import DevicesOneError from "@/components/devices/DevicesOneError";
import ResposiveDoc from "@/components/devices/ResposiveDoc";

export default async function ResponsivePage({ id }: { id: string }) {
    // El texto de la carta lo arma el back; se pide junto con el dispositivo
    const [res, waiverRes] = await Promise.all([
        ListOneDevice({ id: Number(id) }),
        getWaiverContent({ idDevice: Number(id) }),
    ]);

    if (!res) {
        return (
            <DevicesOneError/>
        );
    }

    return (
        <ResposiveDoc
            device={res}
            idDevice={res.id}
            waiver={waiverRes.data ?? null}
            waiverError={waiverRes.success ? "" : waiverRes.message}
        />
    );
}