import PlayAudioButton from "@/components/AudioPlayer/PlayAudioButton";
import Button from "@/components/Button/Button";
import Switcher from "@/components/QuranReader/Switcher";
import { ChapterInfo, Chapters } from "@/types";
import { PropType, defineComponent } from "vue";
import { useSettings } from "@/hooks/settings";
import "@/components/Layout/bism.css";

export default defineComponent({
  props: {
    chapter: {
      type: Object as PropType<Chapters>,
      required: true,
    },
    chapterInfo: {
      type: Object as PropType<ChapterInfo>,
      required: true,
    },
  },
  setup() {
    const settings = useSettings();
    return { settings };
  },
  render() {
    return (
      <>
        <div class="row d-flex justify-content-between mb-5 mt-5">
          <div class="col-6 col-md-4">
            <Switcher />
          </div>
          <div class="col-5 col-md-2">
            <PlayAudioButton audioId={this.chapter.id} />
          </div>
        </div>

        {this.chapter.bismillah_pre && (
          <div class="container-fluid d-flex justify-content-center mb-3">
            <img
              class="img-fluid bismillah-img"
              src="/assets/svg/bismillah.svg"
              alt="Banner"
            />
          </div>
        )}
        <div class="d-flex align-items-center justify-content-center p-3 shadow-md mb-5">
          <h4
            class={`mb-0 ${
              this.settings.isDarkMode.value ? "text-white" : "text-dark"
            }`}
          >
            {this.chapter.name_simple}
          </h4>
          <router-link
            to={{ name: "chapter.info", params: { id: this.$route.params.id } }}
            class="ms-2"
          >
            <font-awesome-icon icon="info-circle" size="2x" />
          </router-link>
        </div>
      </>
    );
  },
});
