import { Chapters, QuranReader, Words } from "@/types";
import { defineComponent, PropType, ref, watch, nextTick, onBeforeUnmount, VNode, computed, Teleport, onMounted } from "vue";
import { Tooltip as BSTooltip, Popover as BSPopover } from "bootstrap";
import { useI18n } from "vue-i18n";
import { useChapters } from "@/hooks/chapters";
import Tooltip from "../Tooltip/Tooltip";
import ButtonBookmark from "./Button/Bookmark";
import ButtonCopy from "./Button/Copy";
import ButtonTafsir from "./Button/Tafsir";
import ButtonPlay from "./Button/Play";
import Popover from "../Popover/Popover";
import styles from "./ArabicText.module.scss";
import AlertDialog from "../AlertDialog/AlertDialog";

interface MarkedError {
    word: Words;
    errorType: string;
    verseNumber: number;
    chapterName: string;
}

export default defineComponent({
    props: {
        words: {
            type: Array as PropType<Words[]>,
            required: true
        },
        chapterId: {
            type: Number
        },
        verseNumber: {
            type: Number
        },
        highlight: {
            type: [Number, Boolean],
            default: false
        },
        enableHover: {
            type: Boolean,
            default: false
        },
        showTooltipWhenHighlight: {
            type: Boolean,
            default: false
        },
        showTransliterationInline: {
            type: Boolean,
            default: false
        },
        showTranslationInline: {
            type: Boolean,
            default: false
        },
        showTransliterationTooltip: {
            type: Boolean,
            default: false
        },
        showTranslationTooltip: {
            type: Boolean,
            default: false
        },
        buttons: {
            type: Array as PropType<QuranReader["PROPS_BUTTON"]>,
            default: () => []
        },
    },
    
    setup(props) {
        const { t } = useI18n();
        const chapters = useChapters();
        const tooltipInstance = ref<Record<number, BSTooltip>>({});
        const popoverInstance = ref<Record<number, BSPopover>>({});
        const popover = ref<BSPopover | null>(null);
        const isHover = ref<boolean>(false);
        const isModalVisible = ref<boolean>(false);
        const modalContent = ref<string>("");
        const refs = ref<{ popoverContent: HTMLElement | null }>({
            popoverContent: null
        });
    
        const verseKey = computed<string>(() => {
            return [props.chapterId, props.verseNumber].filter(v => v !== undefined).join(":");
        });
    
        const chapter = computed<Chapters | null>(() => {
            return props.chapterId ? chapters.find(props.chapterId) : null;
        });
    
        const textUthmani = computed<string>(() => {
            return props.words.map(word => word.text_uthmani).join(" ");
        });
    
        const shouldUseButton = computed<boolean>(() => {
            return props.buttons.length > 0 && props.chapterId !== undefined && props.verseNumber !== undefined;
        });
    
        const correctionTarget = ref<'ayat' | 'kata'>('kata');
        const selectedVerse = ref<number | null>(null);
        const selectedWord = ref<Words | null>(null);
        const markedErrors = ref<MarkedError[]>([]);
    
        // Definisikan errorColors dengan index signature untuk menghindari error implicit any
        const errorColors: { [key: string]: string } = {
            'Gharib': '#CCCCCC',
            'Ghunnah': '#99CCFF',
            'Harokat Tertukar': '#DFF18F',
            'Huruf Tambah/Kurang': '#F4ACB6',
            'Lupa (tidak dibaca)': '#FA7656',
            'Mad (panjang pendek)': '#FFCC99',
            'Makhroj (pengucapan huruf)': '#F4A384',
            'Nun Mati dan Tanwin': '#F8DD74',
            'Qalqalah (memantul)': '#D5B6D4',
            'Tasydid (penekanan)': '#B5C9DF',
            'Urutan Huruf atau Kata': '#FE7D8F',
            'Waqof atau Washol (berhenti atau lanjut)': '#A1D4CF',
            'Waqof dan Ibtida (berhenti dan memulai)': '#90CBAA',
            'Lainnya': '#CC99CC',
            'Ayat Lupa (tidak dibaca)': '#FA7656',
            'Ayat Waqof atau Washol (berhenti atau lanjut)': '#FE7D8F',
            'Ayat Waqof dan Ibtida (berhenti dan memulai)': '#90CBAA',
            'Ayat Lainnya': '#CC99CC',
        };
    
        function isHighlightWord(position: number) {
            return (props.highlight === position);
        }
    
        function onInitTooltip(key: number) {
            return function (tooltip: BSTooltip) {
                tooltipInstance.value[key] = tooltip;
                if (props.showTooltipWhenHighlight && isHighlightWord(key)) {
                    nextTick(() => {
                        tooltip.show();
                    });
                }
            };
        }

        
    
        function onInitPopover(key: number) {
            return function (popover: BSPopover) {
                popoverInstance.value[key] = popover;
            };
        }
    
        function onClickHold(key: number) {
            return function () {
                Object.keys(popoverInstance.value).forEach((keys) => Number(keys) !== key && popoverInstance.value[Number(keys)]?.hide());
                popoverInstance.value[key]?.toggle();
                setTimeout(() => tooltipInstance.value[key]?.hide(), 100);
            };
        }
    
        function showWrongWordModal(word: Words, isVerseEnd = false) {
            correctionTarget.value = isVerseEnd ? 'ayat' : 'kata';
            modalContent.value = isVerseEnd
                ? `Surat  ${chapter.value?.name_simple} Ayat ke ${props.verseNumber}`
                : `Kata ${word.text_uthmani}`;
            isModalVisible.value = true;
        }
    
        function getWordStyle(word: Words) {
            const error = markedErrors.value.find(err => err.word.text_uthmani === word.text_uthmani);
            if (error && error.errorType in errorColors) {
                return { backgroundColor: errorColors[error.errorType] }; // Aman karena errorColors memiliki index signature
            }
            return {};
        }

          function handleKeydown(e: KeyboardEvent) {
            if (e.key === "Escape") {
              closeModal();
            }
          }
        
          onMounted(() => {
            window.addEventListener("keydown", handleKeydown);
          });
        
          onBeforeUnmount(() => {
            window.removeEventListener("keydown", handleKeydown);
            isHover.value = false;
            Object.keys(tooltipInstance.value).forEach((key) => tooltipInstance.value[Number(key)]?.hide());
            Object.keys(popoverInstance.value).forEach((key) => popoverInstance.value[Number(key)]?.hide());
          });
        
    
        function markError(word: Words | null, errorType: string) {
            if (word) {
                markedErrors.value.push({
                    word,
                    errorType,
                    verseNumber: props.verseNumber!,
                    chapterName: chapter.value?.name_simple || ''
                });
                saveMarkedErrors();
                closeModal();
            }
        }
    
        function saveMarkedErrors() {
            try {
                localStorage.setItem('markedErrors', JSON.stringify(markedErrors.value));
            } catch (error) {
                console.error("Failed to save marked errors:", error);
            }
        }
    
        function handleVerseClick() {
            if (props.chapterId && props.verseNumber) {
                modalContent.value = `Anda mengklik seluruh ayat ${props.verseNumber} dari surat ${props.chapterId}`;
                isModalVisible.value = true;
            }
        }
    
        function closeModal() {
            isModalVisible.value = false;
        }
    
        function onMouseOver(key: number) {
            isHover.value = true;
            if (!props.showTooltipWhenHighlight || !isHighlightWord(key)) {
                tooltipInstance.value[key]?.show();
            }
        }
    
        function onMouseLeave(key: number) {
            isHover.value = false;
            if (!props.showTooltipWhenHighlight || !isHighlightWord(key)) {
                tooltipInstance.value[key]?.hide();
            }
        }
     
        function wordWrapper(word: Words, children: VNode) {
            if (!shouldUseButton.value) {
                return (
                    <>
                        {children}
                    </>
                );
            } else {
                return (
                    <Popover
                        key={`popover-${word.id}`}
                        placement="top"
                        options={{ html: true, trigger: "manual", content: () => refs.value.popoverContent! }}
                        onInit={onInitPopover(word.position)}
                        v-clickHold:$300_vibrate={onClickHold(word.position)}
                    >
                        {{
                            title: () => (
                                <div class="text-center">
                                    {t("quran-reader.word-number", { ayah: props.verseNumber })}
                                </div>
                            ),
                            default: () => children
                        }}
                    </Popover>
                );
            }
        }
    
        function selectWord(position: number) {
            selectedWord.value = props.words.find(word => word.position === position) || null;
            selectedVerse.value = null;
        }
    
        function selectVerse(verseNumber: number) {
            selectedVerse.value = verseNumber;
            selectedWord.value = null;
        }
    
        watch(() => props.highlight, (value, oldValue) => {
            if (!props.showTooltipWhenHighlight) {
                return;
            }
    
            if (typeof value === "number") {
                tooltipInstance.value[value]?.show();
            }
    
            if (typeof oldValue === "number") {
                tooltipInstance.value[oldValue]?.hide();
            }
        });
    
        watch(() => props.showTooltipWhenHighlight, (value) => {
            if (typeof props.highlight == "number") {
                tooltipInstance.value[props.highlight]?.[value ? "show" : "hide"]();
            }
        });
    
        onBeforeUnmount(() => {
            isHover.value = false;
            Object.keys(tooltipInstance.value).forEach((key) => tooltipInstance.value[Number(key)]?.hide());
            Object.keys(popoverInstance.value).forEach((key) => popoverInstance.value[Number(key)]?.hide());
        });
    
        return {
            tooltipInstance,
            popoverInstance,
            verseKey,
            refs,
            chapter,
            textUthmani,
            popover,
            isHover,
            shouldUseButton,
            isHighlightWord,
            onInitTooltip,
            onInitPopover,
            onClickHold,
            onMouseOver,
            onMouseLeave,
            wordWrapper,
            showWrongWordModal,
            handleVerseClick,
            modalContent,
            isModalVisible,
            AlertDialog,
            closeModal,
            correctionTarget,
            selectedWord,
            selectedVerse,
            selectWord,
            selectVerse,
            markedErrors,
            errorColors,
            getWordStyle,
            markError,
        };
    },
    render() {
        return (
            <>
               <Teleport to="body">
  {this.isModalVisible && (
    <div
      class="modal fade show d-block"
      tabindex="-1"
      style={{ background: "rgba(0, 0, 0, 0.5)" }}
      onClick={this.closeModal} // Menutup modal saat klik di luar konten
    >
      <div
        class="modal-dialog modal-dialog-centered"
        onClick={(e: MouseEvent) => e.stopPropagation()} // Mencegah event bubbling agar klik di dalam modal tidak menutupnya
      >
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{this.modalContent}</h5>
            <button type="button" class="btn-close" onClick={this.closeModal}></button>
          </div>
          <div class="modal-body">
            {this.correctionTarget === 'kata' ? (
              <>
                <button class="w-100 mb-2 btn" onClick={() => this.markError(this.selectedWord, 'Gharib')} style={{ backgroundColor: "#CCCCCC", borderWidth: "2px", fontWeight: "500" }}>Gharib</button>
                <button class="w-100 mb-2 btn" onClick={() => this.markError(this.selectedWord, 'Ghunnah')} style={{ backgroundColor: "#99CCFF", borderWidth: "2px", fontWeight: "500" }}>Ghunnah</button>
                <button class="w-100 mb-2 btn" onClick={() => this.markError(this.selectedWord, 'Harokat Tertukar')} style={{ backgroundColor: "#DFF18F", borderWidth: "2px", fontWeight: "500" }}>Harokat Tertukar</button>
                <button class="w-100 mb-2 btn" onClick={() => this.markError(this.selectedWord, 'Huruf Tambah/Kurang')} style={{ backgroundColor: "#F4ACB6", borderWidth: "2px", fontWeight: "500" }}>Huruf Tambah/Kurang</button>
                <button class="w-100 mb-2 btn" onClick={() => this.markError(this.selectedWord, 'Lupa (tidak dibaca)')} style={{ backgroundColor: "#FA7656", borderWidth: "2px", fontWeight: "500" }}>Lupa (tidak dibaca)</button>
                <button class="w-100 mb-2 btn" onClick={() => this.markError(this.selectedWord, 'Mad (panjang pendek)')} style={{ backgroundColor: "#FFCC99", borderWidth: "2px", fontWeight: "500" }}>Mad (panjang pendek)</button>
                <button class="w-100 mb-2 btn" onClick={() => this.markError(this.selectedWord, 'Makhroj (pengucapan huruf)')} style={{ backgroundColor: "#F4A384", borderWidth: "2px", fontWeight: "500" }}>Makhroj (pengucapan huruf)</button>
                <button class="w-100 mb-2 btn" onClick={() => this.markError(this.selectedWord, 'Nun Mati dan Tanwin')} style={{ backgroundColor: "#F8DD74", borderWidth: "2px", fontWeight: "500" }}>Nun Mati dan Tanwin</button>
                <button class="w-100 mb-2 btn" onClick={() => this.markError(this.selectedWord, 'Qalqalah (memantul)')} style={{ backgroundColor: "#D5B6D4", borderWidth: "2px", fontWeight: "500" }}>Qalqalah (memantul)</button>
                <button class="w-100 mb-2 btn" onClick={() => this.markError(this.selectedWord, 'Tasydid (penekanan)')} style={{ backgroundColor: "#B5C9DF", borderWidth: "2px", fontWeight: "500" }}>Tasydid (penekanan)</button>
                <button class="w-100 mb-2 btn" onClick={() => this.markError(this.selectedWord, 'Urutan Huruf atau Kata')} style={{ backgroundColor: "#FE7D8F", borderWidth: "2px", fontWeight: "500" }}>Urutan Huruf atau Kata</button>
                <button class="w-100 mb-2 btn" onClick={() => this.markError(this.selectedWord, 'Waqof atau Washol (berhenti atau lanjut)')} style={{ backgroundColor: "#A1D4CF", borderWidth: "2px", fontWeight: "500" }}>Waqof atau Washol (berhenti atau lanjut)</button>
                <button class="w-100 mb-2 btn" onClick={() => this.markError(this.selectedWord, 'Waqof dan Ibtida (berhenti dan memulai)')} style={{ backgroundColor: "#90CBAA", borderWidth: "2px", fontWeight: "500" }}>Waqof dan Ibtida (berhenti dan memulai)</button>
                <button class="w-100 mb-2 btn" onClick={() => this.markError(this.selectedWord, 'Lainnya')} style={{ backgroundColor: "#CC99CC", borderWidth: "2px", fontWeight: "500" }}>Lainnya</button>
              </>
            ) : (
              <>
                <button class="w-100 mb-2 btn" onClick={() => this.markError(this.selectedWord, 'Ayat Lupa (tidak dibaca)')} style={{ backgroundColor: "#FA7656", borderWidth: "2px", fontWeight: "500" }}>Ayat Lupa (tidak dibaca)</button>
                <button class="w-100 mb-2 btn" onClick={() => this.markError(this.selectedWord, "Ayat Waqof atau Washol (berhenti atau lanjut)")} style={{ backgroundColor:'#FE7D8F', borderWidth: "2px", fontWeight: "500" }}>Ayat Waqof atau Washol (berhenti atau lanjut)</button>
                <button class="w-100 mb-2 btn" onClick={() => this.markError(this.selectedWord, 'Ayat Waqof dan Ibtida (berhenti dan memulai)')} style={{ backgroundColor: "#90CBAA", borderWidth: "2px", fontWeight: "500" }}>Ayat Waqof dan Ibtida (berhenti dan memulai)</button>
                <button class="w-100 mb-2 btn" onClick={() => this.markError(this.selectedWord, 'Ayat Lainnya')} style={{ backgroundColor: "#CC99CC", borderWidth: "2px", fontWeight: "500" }}>Ayat Lainnya</button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )}
</Teleport>

                <span dir="rtl" class={[styles.arabic_text, {
                    [styles.highlight]: this.highlight === true,
                    [styles.hover]: this.isHover && this.enableHover
                }]}

                // onClick={() => {
                //     const word = props.words.find((word: { position: any; }) => word.position === somePosition);
                //     if (word) {
                //         this.showWrongWordModal(word);
                //     } else {
                //         console.error("Word not found.");
                //     }
                // }}
          
                >
                    {this.shouldUseButton && (
                        <div class="d-none">
                            <div ref={(ref) => this.refs.popoverContent = (ref as HTMLElement)} class="d-flex">
                                {this.buttons.includes("Bookmark") && this.chapter !== null && (
                                    <ButtonBookmark
                                        verseKey={this.verseKey}
                                        name={this.chapter.name_simple}
                                    />
                                )}
                                {this.buttons.includes("Copy") && (
                                    <ButtonCopy
                                        text={this.textUthmani}
                                    />
                                )}
                                {this.buttons.includes("Tafsir") && (
                                    <ButtonTafsir
                                        chapterId={this.chapterId!}
                                        verseNumber={this.verseNumber!}
                                    />
                                )}
                                {this.buttons.includes("Play") && (
                                    <ButtonPlay
                                        chapterId={this.chapterId!}
                                        verseNumber={this.verseNumber!}
                                    />
                                )}
                            </div>
                        </div>
                    )}
                    {this.words.map(word => this.wordWrapper(word, (
                        <Tooltip
                            key={`tooltip-${word.id}`}
                            tag="div"
                            timeout={0} 
                            options={{
                                trigger: "manual",
                                html: true,
                                delay: {show: 500, hide: 2000},
                            }}
                            class={[styles.text_wrapper, {
                                [styles.highlight_word]: this.isHighlightWord(word.position),
                                "ps-2": this.showTransliterationInline
                            }]}
                            onInit={this.onInitTooltip(word.position)}
                            {
                                ...{
                                    "data-word-position": word.position,
                                    "data-word-location": word.location,
                                    "data-word-type": word.char_type_name,
                                    "onmouseover": () => this.onMouseOver(word.position),
                                    "onmouseleave": () => this.onMouseLeave(word.position),
                                    "onclick": () => {
                                        this.showWrongWordModal(word, word.char_type_name == "end");
                                        this.selectedWord = word;
                                    }
                                }
                            }
                        >
                            <div
                                class={["fs-arabic-auto text-center", {
                                    "font-uthmanic": word.char_type_name == "end",
                                    "font-arabic-auto": word.char_type_name == "word"
                                }]}
                                style={this.getWordStyle(word)} // Terapkan style di sini
                            >
                                {word.text_uthmani}
                            </div>
                            {this.showTransliterationInline && (
                                <div class="text-center mt-1 mb-1">
                                    <i>{word.char_type_name == "word" ? word.transliteration.text : word.translation.text}</i>
                                </div>
                            )}
                            {this.showTranslationInline && (word.char_type_name == "word" || !this.showTransliterationInline) && (
                                <div class="text-center mt-1 mb-1">
                                    <p>{word.translation.text}</p>
                                </div>
                            )}
                        </Tooltip>
                    )))}
                </span>
            </>
        );
    }
});

