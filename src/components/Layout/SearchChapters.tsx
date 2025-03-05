import { computed, defineComponent, Transition, watch, ref, nextTick } from "vue";
import { useChapters } from "@/hooks/chapters";
import { useLocalStorage } from "@/hooks/storage";
import { Chapters } from "@/types";
import styles from "./SearchChapters.module.scss";
import scroll from "@/helpers/scroll";
import Button from "@/components/Button/Button";
import collect from "collect.js";
import Tooltip from "../Tooltip/Tooltip";
import router from "@/routes";

export default defineComponent({
    emits: {
        "update:show": (value: boolean) => true
    },
    props: {
        show: Boolean
    },
    setup(props, { emit }) {
        const storage = useLocalStorage();
        const chapters = useChapters();
        const query = ref("");
        const inputRef = ref<HTMLInputElement | null>(null);
        const shouldShow = computed({
            set(value) {
                emit("update:show", value);
            },
            get() {
                return Boolean(props.show);
            }
        });

        const STORAGE_KEY = "CHAPTERS_FAV";

        const filteredChapters = computed<Chapters[]>(() => {
            if (!query.value.trim()) return [];
            return collect(chapters.data.value)
                .filter((item) => item.name_simple.toLowerCase().includes(query.value.toLowerCase()))
                .take(10)
                .toArray();
        });

        const favorite = computed<Chapters[]>(() => {
            const favoriteData = storage.get(STORAGE_KEY, {});
            return Object.keys(favoriteData)
                .map(id => [id, favoriteData[id]])
                .sort((a, b) => b[1] - a[1])
                .map(([id]) => chapters.find(Number(id)))
                .filter(item => item !== undefined);
        });

        function isFavorite(id: number) {
            return !!storage.get(STORAGE_KEY, {})[id];
        }

        function toggleFavorite(id: number) {
            storage.set(STORAGE_KEY, (fav = {}) => {
                if (fav[id]) {
                    delete fav[id];
                } else {
                    fav[id] = Object.keys(fav).length ? Math.max(...Object.values(fav)) + 1 : 1;
                }
                return fav;
            });
        }

        function gotoChapter(id: number) {
            router.push({ name: "chapter", params: { id: String(id) } });
        }

        watch(shouldShow, (show) => {
            if (show) {
                scroll.disable();
                nextTick(() => inputRef.value?.focus());
            } else {
                scroll.enable();
            }
        }, { immediate: true });

        return {
            shouldShow,
            query,
            filteredChapters,
            favorite,
            inputRef,
            gotoChapter,
            isFavorite,
            toggleFavorite
        };
    },
    render() {
        return (
            <Transition
                enterActiveClass={styles.animate_in}
                leaveActiveClass={styles.animate_out}
                onBeforeLeave={(el) => el.classList.remove(styles.blur)}
                onAfterEnter={(el) => el.classList.add(styles.blur)}
            >
                {this.shouldShow && (
                    <div class={styles.container} onClick={(e) => {
                        if ((e.target as HTMLElement).classList.contains(styles.card_container)) {
                            this.shouldShow = false;
                        }
                    }}>
                        <div class={styles.card_container}>
                            <div class={["card", styles.card]}>
                                <div class={["card-header d-flex justify-content-between", styles.card_header]}>
                                    <div class="h-100 d-flex align-items-center">
                                        <font-awesome-icon icon="search" />
                                    </div>
                                    <div class="w-100 me-3 ms-3 d-flex">
                                        <input
                                            v-model={this.query}
                                            placeholder={`/ ${this.$t("general.search-surah").toLowerCase()}`}
                                            class={styles.search_input}
                                            ref="inputRef"
                                        />
                                        {this.query.trim() && (
                                            <small class={["text-uppercase text-muted", styles.clear_search]} onClick={() => this.query = ""}>
                                                {this.$t("general.clear")}
                                            </small>
                                        )}
                                    </div>
                                    <button class="btn-close" onClick={() => this.shouldShow = false}></button>
                                </div>
                                <div class={["card-body custom-scrollbar", styles.card_body]}>
                                    {!this.query.trim() ? (
                                        <p class="font-monospace text-center">{this.$t("search.type-to-search")}</p>
                                    ) : this.filteredChapters.length > 0 ? this.filteredChapters.map(item => (
                                        <div key={item.id} class={[styles.chapter, "d-flex justify-content-between align-items-center"]}>
                                            <span class="w-100 h-100" onClick={() => this.gotoChapter(item.id)}>
                                                {item.name_simple}
                                            </span>
                                            <Tooltip title={this.$t("general.add-to-favorite")} options={{ container: "." + styles.card }}>
                                                <Button
                                                    size="sm"
                                                    key={[item.id, this.isFavorite(item.id)].toString()}
                                                    type={this.isFavorite(item.id) ? "primary" : "default"}
                                                    onClick={() => this.toggleFavorite(item.id)}
                                                >
                                                    <font-awesome-icon icon="star" />
                                                </Button>
                                            </Tooltip>
                                        </div>
                                    )) : (
                                        <>
                                            <div class="d-flex justify-content-center mb-2">
                                                <img src="/assets/svg/undraw_no_data_re_kwbl.svg" class="img-fluid" width="100" height="100" />
                                            </div>
                                            <p class="font-monospace text-center">{this.$t("search.no-result")}</p>
                                        </>
                                    )}
                                    {this.favorite.length > 0 && (
                                        <div class="mt-3 mb-3">
                                            <h6 class="heading-small text-center">{this.$t("general.favorite")} ({this.favorite.length})</h6>
                                            <hr />
                                            {this.favorite.map(item => (
                                                <div key={item.id} class={[styles.chapter, "d-flex justify-content-between align-items-center"]}>
                                                    <span class="w-100 h-100" onClick={() => this.gotoChapter(item.id)}>
                                                        {item.name_simple}
                                                    </span>
                                                    <Tooltip title={this.$t("general.delete-from-favorite")} options={{ container: "." + styles.card }}>
                                                        <Button
                                                            size="sm"
                                                            type="primary"
                                                            onClick={() => this.toggleFavorite(item.id)}
                                                        >
                                                            <font-awesome-icon icon="star" />
                                                        </Button>
                                                    </Tooltip>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </Transition>
        );
    }
});
