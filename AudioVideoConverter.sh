#!/bin/bash

output_format=mp3
resource_type=audio

help() {
    cat << HELP
    Usage: $(basename "$0") {[-i file_with_links] | [-l link] | <link>} [-f format] [-t (audio|video)] [-s starttime] [-e endtime] [-y] [-v]

    Arguments:
      -h, --help            show this help message and exit
      -l, --link            url link to the resource to convert to the format
      -i, --file            path to input file with the links to convert to the format
      -f, --format          convert to format (default: mp3)
      -t, --type            url link resource type (default: audio)
      -s, --start           set the start time in seconds
      -e, --end             set the end time in seconds
      -y, --overwrite       overwrite output file
      -v, --verbose         increase the verbosity of the bash script
HELP
}

log() {
    [[ $VERBOSE -eq 1 ]] && echo "$@"
}

convert() {
    [[ -z $1 ]] && continue

    link=$1

    if [[ $resource_type == audio ]]; then
        resource_format="best$resource_type";
    elif [[ $resource_type == video ]]; then
        resource_format="best$resource_type+bestaudio";
    fi

    link_filename=`yt-dlp $link -f $resource_format --print filename 2>/dev/null`
    format_filename=${link_filename% *}.$output_format

    log "Downloading \"$link_filename\"..."
    yt-dlp $link -f $resource_format -o "/tmp/$link_filename" > /dev/null

    log "Converting to \"$format_filename\"..."

    args=( "-i" "/tmp/$link_filename" "-hide_banner" "-loglevel" "error" )

    if [[ $resource_type == audio ]]; then
        args+=( "-vn" "-c:a" "libmp3lame" "-b:a" "192k" )
    fi

    if [[ -n $start_time ]]; then
        args+=( "-ss" "$start_time" )
    fi

    if [[ -n $end_time ]]; then 
        args+=( "-to" "$end_time" )
    fi

    args+=( "$format_filename" "$OVERWRITE" )
    ffmpeg "${args[@]}" < /dev/null

    rm "/tmp/$link_filename"
}

POSITIONAL_ARGS=()

while [[ $# -gt 0 ]]; do
    case $1 in
        -l|--link)
            input_link="$2"
            shift 2
            ;;
        -l=*|--link=*)
            input_link="${1#*=}"
            shift
            ;;
        -i|--file)
            input_file="$2"
            shift 2
            ;;
        -i=*|--file=*)
            input_file="${1#*=}"
            shift
            ;;
        -f|--format)
            output_format="$2"
            shift 2
            ;;
        -f=*|--format=*)
            output_format="${1#*=}"
            shift
            ;;
        -t|--type)
            if [[ "$2" != "audio" ]] && [[ "$2" != "video" ]]; then
                echo "Incorrect type: $2. The type should be 'audio' or 'video'"
                exit 1
            fi

            resource_type="$2"
            shift 2
            ;;
        -t=*|--type=*)
            if [[ "${1#*=}" != "audio" ]] && [[ "${1#*=}" != "video" ]]; then
                echo "Incorrect type: ${1#*=}. The type should be 'audio' or 'video'"
                exit 1
            fi

            resource_type="${1#*=}"
            shift
            ;;
        -s|--start)
            start_time="$2"
            shift 2
            ;;
        -s=*|--start=*)
            start_time="${1#*=}"
            shift
            ;;
        -e|--end)
            end_time="$2"
            shift 2
            ;;
        -e=*|--end=*)
            end_time="${1#*=}"
            shift
            ;;
        -y|--overwrite)
            OVERWRITE=-y
            shift
            ;;
        -v|--verbose)
            VERBOSE=1
            shift
            ;;
        -h|--help)
            help
            exit
            ;;
        -*|--*)
            echo "Unknown option: $1"
            exit 1
            ;;
        *)
            POSITIONAL_ARGS+=("$1")
            shift
            ;;
    esac
done

set -- "${POSITIONAL_ARGS[@]}"

if [[ -n $1 ]]; then
    input_link=$1
fi

if [[ -z $1 ]] && [[ -z $input_link ]] && [[ -z $input_file ]]; then
    help
    exit 1
fi

if [[ -n $input_link ]]; then
    convert $input_link
    exit
fi

while read -r link; do
    convert $link
done < "$input_file"
